"""
HomeIQ — Policy, Permission & Validation Layer.

Enforces:
1. Domain-level tool & table sandboxing (`permitted_data`).
2. Mandatory Human Approval Gate (`EXTERNAL_CONSEQUENTIAL` actions).
3. Fact-vs-Estimate verification (ensuring every recorded fact cites a permitted
   PostgreSQL table and record ID, and every recommendation is marked `is_estimate_or_suggestion=True`).
"""
from __future__ import annotations

from typing import Any

from app.core.errors import DomainValidationError
from app.db.enums import ActionRiskLevel
from app.intelligence.schemas import DomainAgentOutput, HouseholdDomainId
from app.intelligence.tool_registry import SHARED_TOOL_REGISTRY

POLICY_INVARIANTS: tuple[str, ...] = (
    "PostgreSQL is the single source of truth; LLMs never fabricate database rows.",
    "All arithmetic, budget rollups, and date countdowns execute in deterministic SQL/Python.",
    "Agents may only invoke tools registered to their domain and permitted table scope.",
    "EXTERNAL_CONSEQUENTIAL tools require explicit Human-in-the-Loop approval before execution.",
    "Agent outputs must strictly separate recorded_facts from estimates_or_suggestions.",
)


class PolicyViolationError(DomainValidationError):
    """Raised when an agent attempts an unauthorized tool call or violates grounding rules."""


class PolicyValidationLayer:
    """Validates tool permissions before execution and verifies grounding after execution."""

    @staticmethod
    def verify_tool_permission(
        *,
        agent_domain: HouseholdDomainId,
        tool_name: str,
        permitted_tables: tuple[str, ...],
    ) -> tuple[bool, ActionRiskLevel]:
        tool = SHARED_TOOL_REGISTRY.get(tool_name)
        if tool is None:
            raise PolicyViolationError(f"Tool '{tool_name}' is not registered in SHARED_TOOL_REGISTRY.")

        if tool.domain != agent_domain:
            raise PolicyViolationError(
                f"Agent '{agent_domain.value}' is not authorized to invoke tool "
                f"'{tool_name}' owned by domain '{tool.domain.value}'."
            )

        for tbl in tool.permitted_tables:
            if tbl not in permitted_tables:
                raise PolicyViolationError(
                    f"Tool '{tool_name}' accesses table '{tbl}' outside agent's permitted_data {permitted_tables}."
                )

        requires_approval = tool.risk_level == ActionRiskLevel.EXTERNAL_CONSEQUENTIAL
        return requires_approval, tool.risk_level

    @staticmethod
    def validate_agent_output(
        output: DomainAgentOutput,
        *,
        permitted_tables: tuple[str, ...],
    ) -> DomainAgentOutput:
        """
        Verifies that:
        1. Every `RecordedHouseholdFact` references a table in the agent's `permitted_tables`
           and has a non-empty `record_id`.
        2. Every `AgentRecommendation` has `is_estimate_or_suggestion=True` so suggestions
           are never presented as database facts.
        """
        for fact in output.recorded_facts:
            if fact.source_table not in permitted_tables:
                raise PolicyViolationError(
                    f"Agent '{output.agent_name}' emitted a fact from unauthorized table '{fact.source_table}'."
                )
            if not fact.record_id.strip():
                raise PolicyViolationError(
                    f"Agent '{output.agent_name}' emitted an ungrounded fact without a record_id."
                )

        for rec in output.estimates_or_suggestions:
            if not rec.is_estimate_or_suggestion:
                raise PolicyViolationError(
                    "All recommendations and estimates must set is_estimate_or_suggestion=True."
                )

        return output


def build_approval_interrupt_payload(
    *,
    domain: HouseholdDomainId,
    tool_name: str,
    arguments: dict[str, Any],
    reason: str,
) -> dict[str, Any]:
    return {
        "interrupt_type": "HUMAN_APPROVAL_REQUIRED",
        "domain": domain.value,
        "tool_name": tool_name,
        "risk_level": ActionRiskLevel.EXTERNAL_CONSEQUENTIAL.value,
        "proposed_arguments": arguments,
        "reason": reason,
    }
