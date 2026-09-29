"""
HomeIQ — Production-Grade Observability (OpenTelemetry + Prometheus Metrics + Correlation IDs).

Covers all 8 telemetry domains without logging sensitive household document contents or secrets:
 1. API: request count, latency histogram, error rate, HTTP status distribution
 2. Database: query latency, connection pool health, failed transactions
 3. Documents: documents processed, success/failure rate, extraction latency, validation failure rate, duplicate-document rate
 4. Gemini: request count, latency, failure count, retry count, token usage, estimated USD cost
 5. RAG: retrieval count, retrieval latency, empty retrieval rate, embedding failures
 6. Agents: agent executions, execution latency, failures, retries, tool calls, orchestrator failures
 7. RabbitMQ: queue depth, message processing rate, failed messages, retry count, dead-letter count
 8. Proactive Intelligence: insights generated, dismissed, resolved, duplicate prevention, rule execution failures
"""
from __future__ import annotations

import time
import uuid
from contextlib import contextmanager
from typing import Any, Callable, Generator

import structlog
from fastapi import FastAPI, Request, Response
from fastapi.responses import PlainTextResponse
from prometheus_client import (
    CONTENT_TYPE_LATEST,
    CollectorRegistry,
    Counter,
    Gauge,
    Histogram,
    generate_latest,
)
from starlette.middleware.base import BaseHTTPMiddleware

try:
    from opentelemetry import trace
    from opentelemetry.sdk.resources import Resource
    from opentelemetry.sdk.trace import TracerProvider

    _OTEL_AVAILABLE = True
except ImportError:  # pragma: no cover
    _OTEL_AVAILABLE = False

# Dedicated Prometheus registry to prevent duplicate metric registration in tests
METRICS_REGISTRY = CollectorRegistry(auto_describe=True)

# -----------------------------------------------------------------------------
# 1. API Metrics
# -----------------------------------------------------------------------------
HTTP_REQUEST_DURATION = Histogram(
    "homeiq_http_request_duration_seconds",
    "HTTP API request latency in seconds",
    ["method", "route", "status_code"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0),
    registry=METRICS_REGISTRY,
)

HTTP_REQUESTS_TOTAL = Counter(
    "homeiq_http_requests_total",
    "Total HTTP API requests received by method, route, and status_code",
    ["method", "route", "status_code"],
    registry=METRICS_REGISTRY,
)

HTTP_ERRORS_TOTAL = Counter(
    "homeiq_http_errors_total",
    "Total HTTP API error responses (4xx and 5xx)",
    ["method", "route", "status_code", "error_class"],
    registry=METRICS_REGISTRY,
)

# -----------------------------------------------------------------------------
# 2. Database Metrics
# -----------------------------------------------------------------------------
DB_QUERY_DURATION = Histogram(
    "homeiq_db_query_duration_seconds",
    "PostgreSQL query and unit-of-work commit latency in seconds",
    ["operation"],
    buckets=(0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0),
    registry=METRICS_REGISTRY,
)

DB_POOL_CHECKED_OUT = Gauge(
    "homeiq_db_pool_checked_out_connections",
    "Current number of checked-out database connections in SQLAlchemy pool",
    registry=METRICS_REGISTRY,
)

DB_FAILED_TRANSACTIONS_TOTAL = Counter(
    "homeiq_db_failed_transactions_total",
    "Total database transactions rolled back due to integrity or runtime errors",
    ["reason"],
    registry=METRICS_REGISTRY,
)

# -----------------------------------------------------------------------------
# 3. Document Intelligence Metrics
# -----------------------------------------------------------------------------
DOCUMENT_PROCESSING_DURATION = Histogram(
    "homeiq_document_processing_duration_seconds",
    "End-to-end Gemini document intelligence pipeline latency in seconds",
    ["category", "status"],
    buckets=(0.05, 0.1, 0.25, 0.5, 1.0, 2.0, 5.0, 10.0, 20.0),
    registry=METRICS_REGISTRY,
)

DOCUMENTS_PROCESSED_TOTAL = Counter(
    "homeiq_documents_processed_total",
    "Total documents processed by category and terminal status (DB_UPDATED, IDEMPOTENT_SKIP, FAILED)",
    ["category", "status"],
    registry=METRICS_REGISTRY,
)

DOCUMENT_VALIDATION_FAILURES_TOTAL = Counter(
    "homeiq_document_validation_failures_total",
    "Total documents rejected by Pydantic schema, confidence floor, or arithmetic validation",
    ["category", "reason"],
    registry=METRICS_REGISTRY,
)

DOCUMENT_DUPLICATES_TOTAL = Counter(
    "homeiq_document_duplicates_total",
    "Total duplicate document uploads short-circuited via SHA-256 idempotency",
    registry=METRICS_REGISTRY,
)

# -----------------------------------------------------------------------------
# 4. Gemini LLM Metrics
# -----------------------------------------------------------------------------
GEMINI_REQUESTS_TOTAL = Counter(
    "homeiq_gemini_requests_total",
    "Total outbound Gemini API requests by model, operation, and status",
    ["model", "operation", "status"],
    registry=METRICS_REGISTRY,
)

GEMINI_REQUEST_DURATION = Histogram(
    "homeiq_gemini_request_duration_seconds",
    "Latency of outbound Gemini API calls in seconds",
    ["model", "operation"],
    buckets=(0.05, 0.1, 0.25, 0.5, 1.0, 2.0, 5.0, 10.0, 15.0),
    registry=METRICS_REGISTRY,
)

GEMINI_FAILURES_TOTAL = Counter(
    "homeiq_gemini_failures_total",
    "Total outbound Gemini API failures by model and error_type",
    ["model", "error_type"],
    registry=METRICS_REGISTRY,
)

GEMINI_RETRIES_TOTAL = Counter(
    "homeiq_gemini_retries_total",
    "Total outbound Gemini API retry attempts due to transient errors or rate limits",
    ["model", "reason"],
    registry=METRICS_REGISTRY,
)

GEMINI_TOKENS_TOTAL = Counter(
    "homeiq_gemini_tokens_total",
    "Total Gemini tokens consumed by model and token type",
    ["model", "token_type"],  # prompt | completion
    registry=METRICS_REGISTRY,
)

GEMINI_ESTIMATED_COST_USD_TOTAL = Counter(
    "homeiq_gemini_estimated_cost_usd_total",
    "Cumulative estimated Gemini API cost in USD",
    ["model"],
    registry=METRICS_REGISTRY,
)

# -----------------------------------------------------------------------------
# 5. RAG & Vector Retrieval Metrics
# -----------------------------------------------------------------------------
RAG_RETRIEVALS_TOTAL = Counter(
    "homeiq_rag_retrievals_total",
    "Total hybrid SQL + pgvector retrieval queries executed",
    ["domain", "status"],
    registry=METRICS_REGISTRY,
)

RAG_RETRIEVAL_DURATION = Histogram(
    "homeiq_rag_retrieval_duration_seconds",
    "Hybrid SQL + pgvector retrieval latency in seconds",
    ["domain"],
    buckets=(0.001, 0.002, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5),
    registry=METRICS_REGISTRY,
)

RAG_EMPTY_RESULTS_TOTAL = Counter(
    "homeiq_rag_empty_results_total",
    "Total RAG retrieval queries that returned zero matching household documents",
    ["domain"],
    registry=METRICS_REGISTRY,
)

RAG_EMBEDDING_FAILURES_TOTAL = Counter(
    "homeiq_rag_embedding_failures_total",
    "Total vector embedding generation or pgvector index failures (gracefully degraded)",
    ["reason"],
    registry=METRICS_REGISTRY,
)

# -----------------------------------------------------------------------------
# 6. Multi-Agent & Orchestrator Metrics
# -----------------------------------------------------------------------------
AGENT_EXECUTIONS_TOTAL = Counter(
    "homeiq_agent_executions_total",
    "Total domain agent executions by domain and status",
    ["domain", "status"],
    registry=METRICS_REGISTRY,
)

AGENT_EXECUTION_DURATION = Histogram(
    "homeiq_agent_execution_duration_seconds",
    "Execution duration of HomeIQ domain agents and orchestrator nodes",
    ["domain", "status"],
    buckets=(0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
    registry=METRICS_REGISTRY,
)

AGENT_FAILURES_TOTAL = Counter(
    "homeiq_agent_failures_total",
    "Total domain agent validation, timeout, or execution failures",
    ["domain", "reason"],
    registry=METRICS_REGISTRY,
)

AGENT_RETRIES_TOTAL = Counter(
    "homeiq_agent_retries_total",
    "Total domain agent retry attempts",
    ["domain"],
    registry=METRICS_REGISTRY,
)

AGENT_TOOL_CALLS_TOTAL = Counter(
    "homeiq_agent_tool_calls_total",
    "Total deterministic application tool invocations by domain agents",
    ["domain", "tool_name", "risk_level"],
    registry=METRICS_REGISTRY,
)

ORCHESTRATOR_FAILURES_TOTAL = Counter(
    "homeiq_orchestrator_failures_total",
    "Total multi-agent orchestrator workflow failures or loop-guard terminations",
    ["reason"],
    registry=METRICS_REGISTRY,
)

# -----------------------------------------------------------------------------
# 7. RabbitMQ / Event Bus Metrics
# -----------------------------------------------------------------------------
EVENT_QUEUE_DEPTH = Gauge(
    "homeiq_event_queue_depth",
    "Current number of pending or dead-lettered events in queue",
    ["queue_name"],
    registry=METRICS_REGISTRY,
)

EVENT_MESSAGES_PROCESSED_TOTAL = Counter(
    "homeiq_event_messages_processed_total",
    "Total domain events processed by event_type and outcome (PROCESSED, IDEMPOTENT_SKIP, DEAD_LETTERED)",
    ["event_type", "outcome"],
    registry=METRICS_REGISTRY,
)

EVENT_RETRIES_TOTAL = Counter(
    "homeiq_event_retries_total",
    "Total event consumer retry attempts",
    ["event_type"],
    registry=METRICS_REGISTRY,
)

EVENT_DLQ_TOTAL = Counter(
    "homeiq_event_dlq_total",
    "Total poison or unrecoverable events routed to the Dead-Letter Queue",
    ["event_type"],
    registry=METRICS_REGISTRY,
)

WORKER_FAILURES_TOTAL = Counter(
    "homeiq_worker_failures_total",
    "Total asynchronous worker / event consumer failures",
    ["event_type", "stage"],
    registry=METRICS_REGISTRY,
)

# -----------------------------------------------------------------------------
# 8. Proactive Household Intelligence Metrics
# -----------------------------------------------------------------------------
PROACTIVE_INSIGHTS_GENERATED_TOTAL = Counter(
    "homeiq_proactive_insights_generated_total",
    "Total proactive household insights generated by insight_type",
    ["insight_type"],
    registry=METRICS_REGISTRY,
)

PROACTIVE_INSIGHTS_STATUS_TOTAL = Counter(
    "homeiq_proactive_insights_status_total",
    "Total proactive insights transitioned by status (ACTIVE, ACKNOWLEDGED, RESOLVED, DISMISSED)",
    ["status"],
    registry=METRICS_REGISTRY,
)

PROACTIVE_DUPLICATES_PREVENTED_TOTAL = Counter(
    "homeiq_proactive_duplicates_prevented_total",
    "Total duplicate proactive reminders/insights suppressed by idempotency check",
    registry=METRICS_REGISTRY,
)

PROACTIVE_RULE_FAILURES_TOTAL = Counter(
    "homeiq_proactive_rule_failures_total",
    "Total proactive rule evaluation failures isolated without halting the engine",
    ["rule_name"],
    registry=METRICS_REGISTRY,
)


# -----------------------------------------------------------------------------
# OpenTelemetry Distributed Tracing Integration
# -----------------------------------------------------------------------------
if _OTEL_AVAILABLE:
    _provider = TracerProvider(resource=Resource.create({"service.name": "homeiq-backend"}))
    trace.set_tracer_provider(_provider)
    _TRACER = trace.get_tracer("homeiq.tracer")
else:  # pragma: no cover
    _TRACER = None

RECENT_TRACE_SPANS: list[dict[str, Any]] = []


@contextmanager
def trace_operation(
    operation_name: str,
    *,
    correlation_id: str | None = None,
    attributes: dict[str, Any] | None = None,
) -> Generator[dict[str, Any], None, None]:
    """
    Creates an OpenTelemetry span (and records lightweight metadata for diagnostics)
    across API request -> document processing -> Gemini -> DB -> event bus -> agent -> RAG.
    Never attaches raw document text or secrets.
    """
    start = time.perf_counter()
    safe_attrs: dict[str, Any] = {}
    if correlation_id:
        safe_attrs["correlation_id"] = correlation_id
    for k, v in (attributes or {}).items():
        if k.lower() not in {"extracted_text", "content_bytes", "raw_prompt", "api_key", "password"}:
            safe_attrs[k] = str(v)

    span_record: dict[str, Any] = {
        "operation": operation_name,
        "attributes": safe_attrs,
        "status": "ok",
    }
    try:
        if _TRACER is not None:
            with _TRACER.start_as_current_span(operation_name) as span:
                for ak, av in safe_attrs.items():
                    span.set_attribute(ak, av)
                yield span_record
        else:
            yield span_record
    except Exception as exc:
        span_record["status"] = "error"
        span_record["error_type"] = type(exc).__name__
        raise
    finally:
        span_record["duration_ms"] = round((time.perf_counter() - start) * 1000.0, 2)
        RECENT_TRACE_SPANS.append(span_record)
        if len(RECENT_TRACE_SPANS) > 200:
            del RECENT_TRACE_SPANS[:100]


def record_gemini_usage(
    *,
    model: str,
    operation: str,
    duration_seconds: float,
    prompt_tokens: int,
    completion_tokens: int,
    status: str = "success",
) -> None:
    """Records Gemini latency, token counts, and estimated USD cost without logging prompt/doc PII."""
    GEMINI_REQUESTS_TOTAL.labels(model=model, operation=operation, status=status).inc()
    GEMINI_REQUEST_DURATION.labels(model=model, operation=operation).observe(duration_seconds)
    GEMINI_TOKENS_TOTAL.labels(model=model, token_type="prompt").inc(prompt_tokens)
    GEMINI_TOKENS_TOTAL.labels(model=model, token_type="completion").inc(completion_tokens)
    input_rate = 0.00000125 if "pro" in model else 0.00000015
    output_rate = 0.00000500 if "pro" in model else 0.00000060
    cost_usd = (prompt_tokens * input_rate) + (completion_tokens * output_rate)
    GEMINI_ESTIMATED_COST_USD_TOTAL.labels(model=model).inc(cost_usd)


class CorrelationAndMetricsMiddleware(BaseHTTPMiddleware):
    """
    Propagates `X-Request-ID` and `X-Correlation-ID` across requests, binds them to
    structlog contextvars, and records Prometheus request count, latency, and error rates.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = request.headers.get("X-Request-ID") or f"req-{uuid.uuid4().hex[:12]}"
        correlation_id = (
            request.headers.get("X-Correlation-ID") or f"corr-{uuid.uuid4().hex[:12]}"
        )
        household_header = request.headers.get("X-HomeIQ-Household-Id")

        structlog.contextvars.clear_contextvars()
        bound_ctx: dict[str, Any] = {
            "request_id": request_id,
            "correlation_id": correlation_id,
            "method": request.method,
            "path": request.url.path,
        }
        if household_header:
            bound_ctx["household_id"] = household_header
        structlog.contextvars.bind_contextvars(**bound_ctx)

        request.state.request_id = request_id
        request.state.correlation_id = correlation_id

        start_time = time.perf_counter()
        with trace_operation(
            f"http.{request.method}.{request.url.path}",
            correlation_id=correlation_id,
            attributes={"request_id": request_id, "path": request.url.path},
        ):
            response: Response = await call_next(request)
        elapsed = time.perf_counter() - start_time

        route_label = request.url.path
        status_str = str(response.status_code)

        HTTP_REQUEST_DURATION.labels(
            method=request.method,
            route=route_label,
            status_code=status_str,
        ).observe(elapsed)
        HTTP_REQUESTS_TOTAL.labels(
            method=request.method,
            route=route_label,
            status_code=status_str,
        ).inc()

        if response.status_code >= 400:
            err_class = "5xx_server_error" if response.status_code >= 500 else "4xx_client_error"
            HTTP_ERRORS_TOTAL.labels(
                method=request.method,
                route=route_label,
                status_code=status_str,
                error_class=err_class,
            ).inc()

        response.headers["X-Request-ID"] = request_id
        response.headers["X-Correlation-ID"] = correlation_id
        return response


def get_operational_metrics_snapshot() -> dict[str, Any]:
    """Returns a structured JSON snapshot of key Prometheus metrics and recent traces."""
    raw_text = generate_latest(METRICS_REGISTRY).decode("utf-8")
    metric_lines = [
        line for line in raw_text.splitlines() if line and not line.startswith("#")
    ]
    return {
        "prometheus_series_count": len(metric_lines),
        "recent_trace_spans_count": len(RECENT_TRACE_SPANS),
        "recent_trace_spans": RECENT_TRACE_SPANS[-15:],
        "sample_series": metric_lines[:40],
    }


def register_observability(app: FastAPI) -> None:
    app.add_middleware(CorrelationAndMetricsMiddleware)

    @app.get("/metrics", include_in_schema=False)
    async def prometheus_metrics_endpoint() -> PlainTextResponse:
        payload = generate_latest(METRICS_REGISTRY).decode("utf-8")
        return PlainTextResponse(content=payload, media_type=CONTENT_TYPE_LATEST)
