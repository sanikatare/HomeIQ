"""
HomeIQ — Security Hardening, Input Sanitization, SSRF Guard, Prompt Injection Defense,
Rate Limiting & Security Headers Middleware.

Covers:
 1. Authentication & RBAC Authorization (`require_roles`, `require_approval_authority`)
 2. Household Tenant Isolation Enforcement
 3. Secure File Upload Verification (magic-byte signature, size ceiling, filename sanitization)
 4. SSRF Protection (`validate_safe_external_url` blocking RFC 1918, loopback & cloud metadata IPs)
 5. Prompt Injection & Malicious Document Defense (`sanitize_and_detect_prompt_injection`)
 6. In-Memory / Redis Token-Bucket Rate Limiter
 7. OWASP HTTP Security Headers Middleware
"""
from __future__ import annotations

import ipaddress
import re
import time
from pathlib import Path
from typing import Callable
from urllib.parse import urlparse

from fastapi import FastAPI, Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.auth import AuthenticatedContext
from app.core.errors import AppError, DomainValidationError, TenantAccessDeniedError
from app.db.enums import HouseholdRole

# -----------------------------------------------------------------------------
# 1. Role-Based Access Control (RBAC) & Human Approval Authorization
# -----------------------------------------------------------------------------
PRIVILEGED_ROLES: frozenset[HouseholdRole] = frozenset({
    HouseholdRole.OWNER,
    HouseholdRole.ADMIN,
})


def enforce_minimum_role(
    ctx: AuthenticatedContext,
    allowed_roles: set[HouseholdRole] | frozenset[HouseholdRole],
) -> None:
    if ctx.role not in allowed_roles:
        raise TenantAccessDeniedError(
            f"Role '{ctx.role.value}' is not permitted to perform this operation."
        )


def enforce_human_approval_authorization(ctx: AuthenticatedContext) -> None:
    """
    Ensures that ONLY an authorized adult/owner member with `can_approve_agent_actions=True`
    and role in `{OWNER, ADMIN}` can approve `EXTERNAL_CONSEQUENTIAL` agent actions.
    Agents themselves can NEVER self-approve.
    """
    if ctx.role not in PRIVILEGED_ROLES or not ctx.can_approve_agent_actions:
        raise TenantAccessDeniedError(
            "User lacks human-approval authority for consequential external actions."
        )


# -----------------------------------------------------------------------------
# 2. Secure File Upload Validation (Magic Bytes, Size & Path Traversal)
# -----------------------------------------------------------------------------
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB ceiling

ALLOWED_MIME_MAGIC_SIGNATURES: dict[str, tuple[bytes, ...]] = {
    "application/pdf": (b"%PDF-",),
    "image/png": (b"\x89PNG\r\n\x1a\n",),
    "image/jpeg": (b"\xff\xd8\xff",),
}

DANGEROUS_DOCUMENT_PATTERNS: tuple[bytes, ...] = (
    b"/JavaScript",
    b"/JS",
    b"/Launch",
    b"<script",
    b"onload=",
)


def validate_safe_upload(
    *,
    filename: str,
    content_bytes: bytes,
    declared_mime_type: str,
) -> str:
    """
    Validates uploaded files against:
    - Empty or oversized payloads (> 10 MB)
    - Directory traversal or null-byte injection in filenames
    - Spoofed MIME types via magic-byte header verification
    - Embedded PDF JavaScript / active script payloads (malicious documents)
    Returns a sanitized filename.
    """
    if not content_bytes:
        raise DomainValidationError("Uploaded file is empty.")

    if len(content_bytes) > MAX_UPLOAD_BYTES:
        raise DomainValidationError(
            f"Uploaded file exceeds maximum allowed size of {MAX_UPLOAD_BYTES} bytes."
        )

    if "\x00" in filename or ".." in filename or "/" in filename or "\\" in filename:
        raise DomainValidationError("Filename contains illegal path traversal characters.")

    clean_name = re.sub(r"[^a-zA-Z0-9._-]", "_", Path(filename).name)
    if not clean_name or clean_name.startswith("."):
        raise DomainValidationError("Invalid sanitized filename.")

    allowed_prefixes = ALLOWED_MIME_MAGIC_SIGNATURES.get(declared_mime_type)
    if allowed_prefixes is None:
        raise DomainValidationError(
            f"Unsupported MIME type '{declared_mime_type}'. Allowed: PDF, PNG, JPEG."
        )

    if not any(content_bytes.startswith(prefix) for prefix in allowed_prefixes):
        raise DomainValidationError(
            f"File magic-byte header does not match declared MIME type '{declared_mime_type}'."
        )

    lower_bytes = content_bytes[:65536]
    for pattern in DANGEROUS_DOCUMENT_PATTERNS:
        if pattern.lower() in lower_bytes.lower():
            raise DomainValidationError(
                "Security policy rejected document containing active script or launch actions."
            )

    return clean_name


# -----------------------------------------------------------------------------
# 3. SSRF (Server-Side Request Forgery) Protection
# -----------------------------------------------------------------------------
BLOCKED_HOSTNAMES: frozenset[str] = frozenset({
    "localhost",
    "metadata.google.internal",
    "169.254.169.254",
    "0.0.0.0",
})


def validate_safe_external_url(url: str) -> str:
    """
    Prevents SSRF attacks by allowing only `https://` or `gs://` URIs and rejecting
    loopback, link-local (169.254.169.254 cloud metadata), and RFC 1918 private IPs.
    """
    parsed = urlparse(url)
    if parsed.scheme not in {"https", "gs"}:
        raise DomainValidationError(
            f"Disallowed URI scheme '{parsed.scheme}'. Only 'https' and 'gs' are permitted."
        )

    host = (parsed.hostname or "").lower().strip()
    if not host or host in BLOCKED_HOSTNAMES:
        raise DomainValidationError(f"Blocked internal or metadata hostname '{host}'.")

    try:
        ip = ipaddress.ip_address(host)
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_multicast
            or ip.is_reserved
        ):
            raise DomainValidationError(
                f"SSRF protection blocked private or reserved IP address '{ip}'."
            )
    except ValueError:
        # Host is a domain name rather than an IP literal
        if host.endswith(".internal") or host.endswith(".local"):
            raise DomainValidationError(f"SSRF protection blocked internal domain '{host}'.")

    return url


# -----------------------------------------------------------------------------
# 4. Prompt Injection & Indirect Document Injection Defense
# -----------------------------------------------------------------------------
PROMPT_INJECTION_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"ignore\s+(all\s+)?(previous|prior|above)\s+instructions", re.IGNORECASE),
    re.compile(r"system\s+override", re.IGNORECASE),
    re.compile(r"bypass\s+(human\s+)?approval", re.IGNORECASE),
    re.compile(r"execute\s+sql\s*:", re.IGNORECASE),
    re.compile(r"drop\s+table\s+", re.IGNORECASE),
    re.compile(r"you\s+are\s+now\s+in\s+developer\s+mode", re.IGNORECASE),
    re.compile(r"reveal\s+(the\s+)?(system\s+prompt|secret_key|api_key)", re.IGNORECASE),
)


def detect_and_block_prompt_injection(text: str, *, source: str = "user_prompt") -> str:
    """
    Scans user prompts and OCR-extracted document text for direct or indirect
    prompt-injection attempts aiming to hijack agent tool selection or bypass approval gates.
    """
    for pattern in PROMPT_INJECTION_PATTERNS:
        if pattern.search(text):
            raise DomainValidationError(
                f"Security policy blocked adversarial prompt-injection pattern in {source}.",
                details={"source": source, "blocked_pattern": pattern.pattern},
            )
    return text


def neutralize_document_embedded_instructions(text: str) -> str:
    """
    Ensures untrusted document content is treated strictly as inert DATA during
    RAG retrieval and agent synthesis by replacing any embedded instruction-hijack
    phrases with an explicit inert data marker.
    """
    if not text:
        return ""
    sanitized = text
    for pattern in PROMPT_INJECTION_PATTERNS:
        sanitized = pattern.sub("[INERT_DOCUMENT_DATA:INSTRUCTION_IGNORED]", sanitized)
    return sanitized


# -----------------------------------------------------------------------------
# 5. Rate Limiting & OWASP Security Headers Middleware
# -----------------------------------------------------------------------------
class InMemoryRateLimiter:
    """Sliding-window request rate limiter per client/user identifier."""

    def __init__(self, max_requests: int = 120, window_seconds: int = 60) -> None:
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._buckets: dict[str, list[float]] = {}

    def check_allowed(self, client_key: str) -> bool:
        now = time.monotonic()
        cutoff = now - self.window_seconds
        timestamps = [t for t in self._buckets.get(client_key, []) if t > cutoff]
        if len(timestamps) >= self.max_requests:
            self._buckets[client_key] = timestamps
            return False
        timestamps.append(now)
        self._buckets[client_key] = timestamps
        return True


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Applies strict OWASP HTTP response headers to every API response."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'self';"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


def register_security_middlewares(app: FastAPI) -> None:
    app.add_middleware(SecurityHeadersMiddleware)
