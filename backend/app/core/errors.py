"""
HomeIQ — Centralized Error Handling & RFC 7807 Problem Details Responses.
Ensures consistent, structured JSON error responses across all API modules
without leaking internal stack traces or secrets.
"""
from __future__ import annotations

from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError, OperationalError

from app.core.logging import get_logger
from app.core.observability import DB_FAILED_TRANSACTIONS_TOTAL

logger = get_logger("errors")


class AppError(Exception):
    """Base application exception with HTTP status and machine-readable code."""

    def __init__(
        self,
        message: str,
        *,
        code: str = "INTERNAL_ERROR",
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}


class ResourceNotFoundError(AppError):
    def __init__(self, resource: str, identifier: Any) -> None:
        super().__init__(
            f"{resource} '{identifier}' was not found in this household.",
            code="RESOURCE_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
            details={"resource": resource, "identifier": str(identifier)},
        )


class TenantAccessDeniedError(AppError):
    def __init__(self, message: str = "Insufficient permissions for target household.") -> None:
        super().__init__(
            message,
            code="TENANT_ACCESS_DENIED",
            status_code=status.HTTP_403_FORBIDDEN,
        )


class DomainValidationError(AppError):
    def __init__(self, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(
            message,
            code="DOMAIN_VALIDATION_FAILED",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=details,
        )


class ConflictError(AppError):
    def __init__(self, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(
            message,
            code="RESOURCE_CONFLICT",
            status_code=status.HTTP_409_CONFLICT,
            details=details,
        )


class DependencyUnavailableError(AppError):
    def __init__(
        self,
        dependency: str,
        message: str = "Required backing service is temporarily unavailable.",
        *,
        retryable: bool = True,
    ) -> None:
        super().__init__(
            message,
            code="DEPENDENCY_UNAVAILABLE",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            details={"dependency": dependency, "retryable": retryable},
        )


class DocumentProcessingError(AppError):
    def __init__(
        self,
        message: str,
        *,
        retryable: bool = False,
        stage: str = "extraction",
        details: dict[str, Any] | None = None,
    ) -> None:
        merged = {"retryable": retryable, "stage": stage, **(details or {})}
        super().__init__(
            message,
            code="DOCUMENT_PIPELINE_ERROR",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=merged,
        )
        self.retryable = retryable
        self.stage = stage


def _trace_ids(request: Request) -> dict[str, str]:
    req_id = getattr(request.state, "request_id", None) or request.headers.get("X-Request-ID", "")
    corr_id = getattr(request.state, "correlation_id", None) or request.headers.get(
        "X-Correlation-ID", ""
    )
    out: dict[str, str] = {}
    if req_id:
        out["request_id"] = req_id
    if corr_id:
        out["correlation_id"] = corr_id
    return out


def register_exception_handlers(app: FastAPI) -> None:
    """Attaches centralized exception handlers to the FastAPI application."""

    @app.exception_handler(AppError)
    async def handle_app_error(request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "details": exc.details,
                    "path": request.url.path,
                    **_trace_ids(request),
                }
            },
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        request: Request,
        exc: RequestValidationError,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": {
                    "code": "REQUEST_SCHEMA_INVALID",
                    "message": "Request payload failed Pydantic schema validation.",
                    "details": {"errors": exc.errors()},
                    "path": request.url.path,
                    **_trace_ids(request),
                }
            },
        )

    @app.exception_handler(IntegrityError)
    async def handle_integrity_error(request: Request, exc: IntegrityError) -> JSONResponse:
        DB_FAILED_TRANSACTIONS_TOTAL.labels(reason="integrity_error").inc()
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "error": {
                    "code": "DATABASE_CONSTRAINT_VIOLATION",
                    "message": "Operation violated a database uniqueness, check, or foreign-key constraint.",
                    "details": {"constraint_error": "Database integrity constraint violated."},
                    "path": request.url.path,
                    **_trace_ids(request),
                }
            },
        )

    @app.exception_handler(OperationalError)
    async def handle_operational_error(request: Request, exc: OperationalError) -> JSONResponse:
        DB_FAILED_TRANSACTIONS_TOTAL.labels(reason="operational_error").inc()
        logger.error("database.operational_error", path=request.url.path, error_type="OperationalError")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "error": {
                    "code": "DATABASE_UNAVAILABLE",
                    "message": "Database connection or transaction failed safely; no partial state committed.",
                    "details": {"retryable": True},
                    "path": request.url.path,
                    **_trace_ids(request),
                }
            },
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_exception(request: Request, exc: Exception) -> JSONResponse:
        logger.error(
            "api.unhandled_exception",
            path=request.url.path,
            error_type=type(exc).__name__,
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": "An unexpected internal error occurred. The transaction was safely rolled back.",
                    "details": {"error_type": type(exc).__name__},
                    "path": request.url.path,
                    **_trace_ids(request),
                }
            },
        )
