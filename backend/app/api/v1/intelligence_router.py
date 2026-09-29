"""
HomeIQ — FastAPI Routers for the Multi-Agent Orchestrator, Human Approval Gate,
Proactive Intelligence Engine, and Event-Driven RabbitMQ Bus.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthenticatedContext, get_current_context
from app.core.database import get_db_session
from app.core.errors import DomainValidationError, ResourceNotFoundError
from app.core.observability import get_operational_metrics_snapshot
from app.core.security import (
    detect_and_block_prompt_injection,
    enforce_human_approval_authorization,
)
from app.db.enums import AgentRunStatus
from app.events.bus import (
    EventProcessingOutcome,
    HomeIQEventBus,
    HouseholdEventType,
    TypedEventEnvelope,
)
from app.intelligence.domain_agents import DOMAIN_AGENT_SPECS
from app.evaluation.runner import HomeIQEvaluationRunner
from app.evaluation.schemas import CompleteEvaluationReport
from app.intelligence.orchestrator import HomeIQAgentOrchestrator
from app.intelligence.proactive import (
    ProactiveEvaluationReport,
    ProactiveIntelligenceEngine,
)
from app.intelligence.schemas import OrchestratorExecutionResult
from app.repositories.household_repositories import RepositoryRegistry

intelligence_router = APIRouter(prefix="/intelligence", tags=["19. Multi-Agent & Proactive Intelligence"])
events_router = APIRouter(prefix="/events", tags=["20. Event-Driven Architecture (RabbitMQ)"])

# Shared singleton event bus instance for API/worker dispatch
shared_event_bus = HomeIQEventBus()


class AgentQueryRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_query: str = Field(min_length=2, max_length=2000)
    thread_id: str | None = None
    parameters: dict[str, Any] = Field(default_factory=dict)


class ApprovalDecisionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    approved: bool
    reason: str | None = None


class ApprovalDecisionResponse(BaseModel):
    run_id: uuid.UUID
    status: AgentRunStatus
    approved_by_user_id: uuid.UUID
    decided_at: datetime


class PublishEventRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    event_type: HouseholdEventType
    idempotency_key: str = Field(min_length=3, max_length=128)
    domain: str = Field(min_length=2, max_length=64)
    asset_id: uuid.UUID | None = None
    payload: dict[str, Any] = Field(default_factory=dict)


@intelligence_router.get("/agents")
async def list_domain_agent_specifications() -> list[dict[str, Any]]:
    return [
        {
            "domain": spec.domain.value,
            "agent_name": spec.agent_name,
            "responsibilities": list(spec.responsibilities),
            "tools": list(spec.tools),
            "permitted_data": list(spec.permitted_data),
            "relevant_entities": list(spec.relevant_entities),
            "relevant_events": list(spec.relevant_events),
            "validation_rules": list(spec.validation_rules),
            "failure_behavior": spec.failure_behavior,
        }
        for spec in DOMAIN_AGENT_SPECS.values()
    ]


@intelligence_router.post("/execute", response_model=OrchestratorExecutionResult)
async def execute_agent_workflow(
    payload: AgentQueryRequest,
    session: AsyncSession = Depends(get_db_session),
    ctx: AuthenticatedContext = Depends(get_current_context),
) -> OrchestratorExecutionResult:
    # Security Check: Block direct prompt injection before invoking router/agents
    sanitized_query = detect_and_block_prompt_injection(
        payload.user_query, source="user_query"
    )
    orchestrator = HomeIQAgentOrchestrator(session)
    result = await orchestrator.execute_workflow(
        household_id=ctx.household_id,
        user_id=ctx.user_id,
        user_query=sanitized_query,
        thread_id=payload.thread_id,
        parameters=payload.parameters,
    )
    await session.commit()
    return result


@intelligence_router.get("/approvals")
async def list_approval_runs(
    session: AsyncSession = Depends(get_db_session),
    ctx: AuthenticatedContext = Depends(get_current_context),
) -> dict[str, Any]:
    repos = RepositoryRegistry(session)
    runs, total = await repos.agent_runs.list_for_household(ctx.household_id, offset=0, limit=50)
    approval_runs = [r for r in runs if r.requires_human_approval]
    return {
        "total": len(approval_runs),
        "items": [
            {
                "run_id": str(r.id),
                "thread_id": r.thread_id,
                "agent_name": r.agent_name,
                "target_domain": r.target_domain,
                "user_query": r.user_query,
                "status": r.status.value if hasattr(r.status, "value") else str(r.status),
                "highest_risk_level": (
                    r.highest_risk_level.value
                    if hasattr(r.highest_risk_level, "value")
                    else str(r.highest_risk_level)
                ),
                "proposed_tool_calls": r.proposed_tool_calls_json,
                "final_response": r.final_response,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "completed_at": r.completed_at.isoformat() if r.completed_at else None,
            }
            for r in approval_runs
        ],
    }


@intelligence_router.post(
    "/approvals/{run_id}/decide",
    response_model=ApprovalDecisionResponse,
)
async def decide_human_approval(
    run_id: uuid.UUID,
    payload: ApprovalDecisionRequest,
    session: AsyncSession = Depends(get_db_session),
    ctx: AuthenticatedContext = Depends(get_current_context),
) -> ApprovalDecisionResponse:
    # Security Check: Only OWNER/ADMIN with can_approve_agent_actions=True may sign off
    enforce_human_approval_authorization(ctx)

    repos = RepositoryRegistry(session)
    run = await repos.agent_runs.get_by_id(ctx.household_id, run_id)
    if run is None:
        raise ResourceNotFoundError("AgentRun", run_id)

    if run.status != AgentRunStatus.AWAITING_HUMAN_APPROVAL:
        raise DomainValidationError(
            f"AgentRun '{run_id}' is in status '{run.status.value}' and is not awaiting approval."
        )

    new_status = (
        AgentRunStatus.APPROVED_COMPLETED
        if payload.approved
        else AgentRunStatus.REJECTED_BY_USER
    )
    decided_time = datetime.now(timezone.utc)
    await repos.agent_runs.update_fields(
        run,
        {
            "status": new_status,
            "approved_by_user_id": ctx.user_id,
            "decided_at": decided_time,
        },
        updated_by_id=ctx.user_id,
    )

    if payload.approved:
        from app.db.enums import BillStatus

        bills, _ = await repos.bills.list_for_household(ctx.household_id, offset=0, limit=20)
        for b in bills:
            if b.status == BillStatus.PENDING:
                b.status = BillStatus.PAID
                b.paid_at = decided_time
                break

    await session.commit()

    return ApprovalDecisionResponse(
        run_id=run.id,
        status=new_status,
        approved_by_user_id=ctx.user_id,
        decided_at=decided_time,
    )


@intelligence_router.post(
    "/proactive/evaluate",
    response_model=ProactiveEvaluationReport,
)
async def evaluate_proactive_insights(
    session: AsyncSession = Depends(get_db_session),
    ctx: AuthenticatedContext = Depends(get_current_context),
) -> ProactiveEvaluationReport:
    engine = ProactiveIntelligenceEngine(session)
    report = await engine.evaluate_household(
        household_id=ctx.household_id,
        recipient_user_id=ctx.user_id,
    )
    await session.commit()
    return report


@intelligence_router.get("/evaluation/datasets")
async def get_evaluation_dataset_manifest(
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    runner = HomeIQEvaluationRunner(session=session, use_live_gemini=False)
    manifest = runner.load_manifest()
    return manifest.model_dump()


@intelligence_router.post(
    "/evaluation/run",
    response_model=CompleteEvaluationReport,
)
async def execute_evaluation_harness(
    session: AsyncSession = Depends(get_db_session),
    ctx: AuthenticatedContext = Depends(get_current_context),
) -> CompleteEvaluationReport:
    runner = HomeIQEvaluationRunner(session=session, use_live_gemini=False)
    report = await runner.run_complete_evaluation()
    await session.commit()
    return report


@intelligence_router.get("/observability/summary")
async def get_observability_summary() -> dict[str, Any]:
    snapshot = get_operational_metrics_snapshot()
    snapshot["event_bus"] = {
        "published_events_total": len(shared_event_bus.published_log),
        "dlq_depth": len(shared_event_bus.dead_letter_queue),
        "processed_idempotency_keys_count": len(shared_event_bus._processed_idempotency_keys),
    }
    return snapshot


@events_router.get("")
async def list_events_and_dlq(
    session: AsyncSession = Depends(get_db_session),
    ctx: AuthenticatedContext = Depends(get_current_context),
) -> dict[str, Any]:
    repos = RepositoryRegistry(session)
    events, total = await repos.events.list_for_household(ctx.household_id, offset=0, limit=50)
    return {
        "total": total,
        "items": [
            {
                "id": str(ev.id),
                "event_type": ev.event_type,
                "domain": ev.domain,
                "severity": ev.severity.value if hasattr(ev.severity, "value") else str(ev.severity),
                "correlation_id": ev.correlation_id,
                "payload_json": ev.payload_json,
                "processed_by_worker": ev.processed_by_worker,
                "occurred_at": ev.occurred_at.isoformat() if ev.occurred_at else None,
            }
            for ev in events
        ],
        "dead_letter_queue": [
            {
                "event_id": str(dlq.envelope.event_id),
                "event_type": dlq.envelope.event_type.value,
                "idempotency_key": dlq.envelope.idempotency_key,
                "attempts": dlq.attempts,
                "failure_reason": dlq.failure_reason,
                "failed_at": dlq.failed_at.isoformat(),
            }
            for dlq in shared_event_bus.dead_letter_queue
            if dlq.envelope.household_id == ctx.household_id
        ],
    }


@events_router.post(
    "/publish",
    response_model=EventProcessingOutcome,
    status_code=status.HTTP_201_CREATED,
)
async def publish_typed_event(
    payload: PublishEventRequest,
    session: AsyncSession = Depends(get_db_session),
    ctx: AuthenticatedContext = Depends(get_current_context),
) -> EventProcessingOutcome:
    envelope = TypedEventEnvelope(
        event_type=payload.event_type,
        household_id=ctx.household_id,
        actor_user_id=ctx.user_id,
        asset_id=payload.asset_id,
        idempotency_key=payload.idempotency_key,
        domain=payload.domain,
        payload=payload.payload,
    )
    outcome = await shared_event_bus.publish_and_consume(session, envelope)
    await session.commit()
    return outcome
