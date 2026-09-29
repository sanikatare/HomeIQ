"""
HomeIQ — Multi-Agent Framework Input/Output Schemas & Fact/Estimate Separation Contracts.

Crucial Principle:
Every domain agent output explicitly separates:
 1. `recorded_facts`: Verifiable facts retrieved deterministically from PostgreSQL tables or
    indexed household documents, accompanied by exact record IDs or document citations.
 2. `estimates_or_suggestions`: Advisory recommendations, projections, or action proposals
    explicitly flagged with `is_estimate=True` and rationale so they are never mistaken for
    stored database truth.
"""
from __future__ import annotations

import uuid
from datetime import datetime
try:
    from enum import StrEnum
except ImportError:
    from enum import Enum

    class StrEnum(str, Enum):  # type: ignore[no-redef]
        pass
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.db.enums import ActionRiskLevel, AgentRunStatus


class HouseholdDomainId(StrEnum):
    KITCHEN_GROCERY = "kitchen_grocery"
    LAUNDRY_CLOTHING = "laundry_clothing"
    HOME_MAINTENANCE = "home_maintenance"
    BILLS_UTILITIES = "bills_utilities"
    EXPENSE_BUDGET = "expense_budget"
    VEHICLE_MOBILITY = "vehicle_mobility"
    DOCUMENTS_WARRANTY = "documents_warranty"


class RecordedHouseholdFact(BaseModel):
    """
    A strictly grounded fact retrieved from a PostgreSQL entity or document chunk.
    Must never be fabricated by the LLM.
    """

    model_config = ConfigDict(extra="forbid")

    source_table: str = Field(description="PostgreSQL table name (e.g., warranties, expenses, bills).")
    record_id: str = Field(description="Primary key UUID or asset_tag of the source record.")
    field_or_metric: str
    recorded_value: str
    is_deterministic_calculation: bool = False
    citation_document_id: str | None = None


class AgentRecommendation(BaseModel):
    """
    Clearly separated estimate, suggestion, or proposed action.
    Always marked `is_estimate_or_suggestion=True` to distinguish from database facts.
    """

    model_config = ConfigDict(extra="forbid")

    title: str
    recommendation_text: str
    is_estimate_or_suggestion: bool = True
    basis_or_assumption: str = Field(
        description="Explains how this suggestion or estimate was derived from recorded facts."
    )
    proposed_action_tool: str | None = None
    risk_level: ActionRiskLevel = ActionRiskLevel.READ_ONLY


class DomainAgentInput(BaseModel):
    """Standardized input schema passed to any of the 7 domain agents."""

    model_config = ConfigDict(extra="forbid")

    household_id: uuid.UUID
    user_id: uuid.UUID
    thread_id: str
    domain: HouseholdDomainId
    user_query: str
    planner_subtask_instruction: str | None = None
    target_asset_id: uuid.UUID | None = None
    parameters: dict[str, Any] = Field(default_factory=dict)


class DomainAgentOutput(BaseModel):
    """
    Standardized structured output returned by each of the 7 domain agents.
    Enforces strict separation of recorded database facts vs. estimates/suggestions.
    """

    model_config = ConfigDict(extra="forbid")

    domain: HouseholdDomainId
    agent_name: str
    summary_answer: str
    recorded_facts: list[RecordedHouseholdFact] = Field(default_factory=list)
    estimates_or_suggestions: list[AgentRecommendation] = Field(default_factory=list)
    deterministic_metrics: dict[str, Any] = Field(default_factory=dict)
    invoked_tools: list[str] = Field(default_factory=list)
    emitted_events: list[str] = Field(default_factory=list)
    requires_human_approval: bool = False
    pending_approval_payload: dict[str, Any] | None = None
    validation_passed: bool = True
    fallback_or_failure_note: str | None = None


class RouteClassification(BaseModel):
    """Output of the Agent Router node."""

    model_config = ConfigDict(extra="forbid")

    primary_domain: HouseholdDomainId
    secondary_domains: list[HouseholdDomainId] = Field(default_factory=list)
    is_multi_domain: bool = False
    intent_summary: str
    estimated_risk_level: ActionRiskLevel = ActionRiskLevel.READ_ONLY
    routing_confidence: float = Field(ge=0.0, le=1.0)


class PlannedStep(BaseModel):
    model_config = ConfigDict(extra="forbid")

    step_index: int
    domain: HouseholdDomainId
    instruction: str
    required_tool_name: str
    depends_on_steps: list[int] = Field(default_factory=list)


class ExecutionPlan(BaseModel):
    """Output of the Planning Agent node for single or cross-domain workflows."""

    model_config = ConfigDict(extra="forbid")

    goal_summary: str
    steps: list[PlannedStep]


class TraceSpanRecord(BaseModel):
    node_name: str
    domain: str | None = None
    started_at: datetime
    duration_ms: int
    status: str
    details: dict[str, Any] = Field(default_factory=dict)


class OrchestratorExecutionResult(BaseModel):
    run_id: uuid.UUID
    thread_id: str
    household_id: uuid.UUID
    status: AgentRunStatus
    route: RouteClassification
    plan: ExecutionPlan
    domain_outputs: list[DomainAgentOutput]
    synthesized_response: str
    recorded_facts: list[RecordedHouseholdFact]
    estimates_or_suggestions: list[AgentRecommendation]
    requires_human_approval: bool
    pending_approval_payload: dict[str, Any] | None = None
    trace_spans: list[TraceSpanRecord]
    total_latency_ms: int
