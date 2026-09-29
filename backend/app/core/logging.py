"""
HomeIQ — Structured Logging Configuration (structlog + correlation context + PII/Secret Redaction).

Every important request/workflow binds:
 - `request_id`
 - `correlation_id`
 - `household_id` (where safe)
 - `document_id` (where applicable)
 - `event_id` (where applicable)
 - `agent_run_id` (where applicable)

Never logs:
 - passwords / password_hash
 - API keys / GEMINI_API_KEY / SECRET_KEY
 - access_token / refresh_token / authorization headers
 - raw household document contents (`extracted_text`, `content_bytes`, `raw_prompt`)
"""
from __future__ import annotations

import logging
import sys
from typing import Any

import structlog

from app.core.config import settings

REDACTED_Placeholder = "[REDACTED_BY_HOMEIQ_POLICY]"

SENSITIVE_LOG_KEYS: frozenset[str] = frozenset({
    "password",
    "password_hash",
    "secret",
    "secret_key",
    "api_key",
    "gemini_api_key",
    "access_token",
    "refresh_token",
    "authorization",
    "cookie",
    "extracted_text",
    "content_bytes",
    "raw_prompt",
    "raw_document_text",
    "private_key",
})


def redact_sensitive_fields(
    logger: Any,
    method_name: str,
    event_dict: dict[str, Any],
) -> dict[str, Any]:
    """
    Structlog processor that recursively scrubs secrets, credentials, and raw
    household document contents before any log entry is serialized.
    """

    def _scrub(obj: Any) -> Any:
        if isinstance(obj, dict):
            cleaned: dict[str, Any] = {}
            for k, v in obj.items():
                key_lower = str(k).lower()
                if key_lower in SENSITIVE_LOG_KEYS or any(
                    s in key_lower for s in ("password", "secret", "api_key", "token")
                ):
                    cleaned[k] = REDACTED_Placeholder
                else:
                    cleaned[k] = _scrub(v)
            return cleaned
        if isinstance(obj, list):
            return [_scrub(item) for item in obj]
        return obj

    for key in list(event_dict.keys()):
        key_lower = str(key).lower()
        if key_lower in SENSITIVE_LOG_KEYS or any(
            s in key_lower for s in ("password", "secret", "api_key", "token")
        ):
            event_dict[key] = REDACTED_Placeholder
        else:
            event_dict[key] = _scrub(event_dict[key])
    return event_dict


def configure_logging() -> None:
    """Configures structured JSON logging in production/staging and readable logs in local dev."""
    shared_processors: list[Any] = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        redact_sensitive_fields,
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]

    if settings.APP_ENV in {"production", "staging"}:
        renderer: Any = structlog.processors.JSONRenderer()
    else:
        renderer = structlog.dev.ConsoleRenderer(colors=False)

    level_num = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    structlog.configure(
        processors=[*shared_processors, renderer],
        wrapper_class=structlog.make_filtering_bound_logger(level_num),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(file=sys.stdout),
        cache_logger_on_first_use=True,
    )


def get_logger(component: str) -> Any:
    return structlog.get_logger(service=settings.APP_NAME, component=component)
