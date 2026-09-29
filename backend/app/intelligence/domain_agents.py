"""
HomeIQ — The Seven Household Domain Agents (Shared LangGraph + Gemini Infrastructure).

Defines explicit specifications and execution logic for all 7 domain agents:
 1. Kitchen & Grocery Agent (`kitchen_grocery`)
 2. Laundry & Clothing Agent (`laundry_clothing`)
 3. Home Maintenance Agent (`home_maintenance`)
 4. Bills & Utilities Agent (`bills_utilities`)
 5. Expense & Budget Agent (`expense_budget`)
 6. Vehicle & Mobility Agent (`vehicle_mobility`)
 7. Documents, Warranty & Insurance Agent (`documents_warranty`)

All agents share:
 - `SHARED_TOOL_REGISTRY`
 - `SharedRetrievalInterface`
 - `PolicyValidationLayer`
 - Single SQLAlchemy `AsyncSession`
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.enums import ActionRiskLevel
from app.intelligence.policy import (
    PolicyValidationLayer,
    build_approval_interrupt_payload,
)
from app.intelligence.schemas import (
    AgentRecommendation,
    DomainAgentInput,
    DomainAgentOutput,
    HouseholdDomainId,
    RecordedHouseholdFact,
)
from app.intelligence.tool_registry import SHARED_TOOL_REGISTRY


@dataclass(frozen=True)
class DomainAgentSpec:
    domain: HouseholdDomainId
    agent_name: str
    responsibilities: tuple[str, ...]
    tools: tuple[str, ...]
    permitted_data: tuple[str, ...]
    input_schema_name: str
    output_schema_name: str
    relevant_entities: tuple[str, ...]
    relevant_events: tuple[str, ...]
    validation_rules: tuple[str, ...]
    failure_behavior: str
    system_prompt: str


# =============================================================================
# Canonical Specifications for All 7 Household Domain Agents
# =============================================================================
DOMAIN_AGENT_SPECS: dict[HouseholdDomainId, DomainAgentSpec] = {
    HouseholdDomainId.DOCUMENTS_WARRANTY: DomainAgentSpec(
        domain=HouseholdDomainId.DOCUMENTS_WARRANTY,
        agent_name="Documents, Warranty & Insurance Agent",
        responsibilities=(
            "Retrieve and verify warranty coverage windows, parts/labor terms, and claim helplines for household assets.",
            "Audit motor, home structure, and appliance insurance policies for renewal dates and sum insured (IDV).",
            "Provide verbatim document citations from the household vault without inventing policy terms.",
        ),
        tools=("verify_warranties_insurance_and_documents",),
        permitted_data=("documents", "warranties", "insurance_policies", "assets"),
        input_schema_name="DomainAgentInput",
        output_schema_name="DomainAgentOutput",
        relevant_entities=("Document", "Warranty", "InsurancePolicy", "Asset"),
        relevant_events=(
            "document.intelligence.completed",
            "warranty.coverage.verified",
            "insurance.renewal.alerted",
        ),
        validation_rules=(
            "Every warranty or policy statement must cite a recorded `warranties`, `insurance_policies`, or `documents` UUID.",
            "If no matching coverage exists in PostgreSQL, explicitly state 'No active coverage record found' rather than guessing.",
        ),
        failure_behavior=(
            "Return deterministic SQL warranty/insurance records with `fallback_or_failure_note` "
            "if semantic document search or LLM synthesis is unavailable."
        ),
        system_prompt=(
            "You are the HomeIQ Documents, Warranty & Insurance Agent. Ground every coverage answer "
            "in retrieved `warranties`, `insurance_policies`, and `documents` rows. Never guess coverage terms."
        ),
    ),
    HouseholdDomainId.KITCHEN_GROCERY: DomainAgentSpec(
        domain=HouseholdDomainId.KITCHEN_GROCERY,
        agent_name="Kitchen & Grocery Agent",
        responsibilities=(
            "Monitor pantry and refrigerator stock quantities against deterministic reorder thresholds.",
            "Identify expiring inventory items and prioritize FIFO consumption.",
            "Generate replenishment shopping list items and clearly label meal ideas or price estimates as suggestions.",
        ),
        tools=("inspect_pantry_and_shopping_list", "add_replenishment_grocery_item"),
        permitted_data=("inventory_items", "grocery_items"),
        input_schema_name="DomainAgentInput",
        output_schema_name="DomainAgentOutput",
        relevant_entities=("InventoryItem", "GroceryItem"),
        relevant_events=(
            "inventory.low_stock.detected",
            "grocery.item.added",
            "inventory.expiry.warning",
        ),
        validation_rules=(
            "Stock deficits (`quantity_on_hand <= reorder_threshold`) must be computed in SQL/Python, not estimated by LLM.",
            "Shopping cart cost projections must be flagged as `is_estimate_or_suggestion=True`.",
        ),
        failure_behavior=(
            "Fall back to returning raw low-stock `inventory_items` and unpurchased `grocery_items` "
            "without recipe/meal suggestions."
        ),
        system_prompt=(
            "You are the HomeIQ Kitchen & Grocery Agent. Distinguish recorded pantry quantities "
            "from suggested recipes or estimated replenishment costs."
        ),
    ),
    HouseholdDomainId.LAUNDRY_CLOTHING: DomainAgentSpec(
        domain=HouseholdDomainId.LAUNDRY_CLOTHING,
        agent_name="Laundry & Clothing Agent",
        responsibilities=(
            "Classify wardrobe items by fabric composition, wash care method, and maximum temperature.",
            "Prevent fabric damage by separating dry-clean-only and delicate garments from standard machine loads.",
            "Track garment wear counts and suggest compatible wash batches.",
        ),
        tools=("analyze_wardrobe_and_wash_compatibility",),
        permitted_data=("clothing_items", "household_members"),
        input_schema_name="DomainAgentInput",
        output_schema_name="DomainAgentOutput",
        relevant_entities=("ClothingItem", "HouseholdMember"),
        relevant_events=("laundry.batch.recommended", "clothing.care_alert.emitted"),
        validation_rules=(
            "Never recommend machine washing a garment whose recorded `wash_care_method` is `DRY_CLEAN_ONLY` or `HAND_WASH_ONLY`.",
            "Batch temperature ceiling must equal the minimum `max_wash_temp_celsius` among grouped garments.",
        ),
        failure_behavior=(
            "Return the deterministic care-label grouping dictionary directly from `clothing_items`."
        ),
        system_prompt=(
            "You are the HomeIQ Laundry & Clothing Agent. Enforce strict fabric care constraints "
            "recorded in `clothing_items`."
        ),
    ),
    HouseholdDomainId.HOME_MAINTENANCE: DomainAgentSpec(
        domain=HouseholdDomainId.HOME_MAINTENANCE,
        agent_name="Home Maintenance Agent",
        responsibilities=(
            "Track preventive maintenance intervals and next-service due dates for household appliances and equipment.",
            "Correlate asset breakdowns with active warranties before recommending paid technician visits.",
            "Maintain historical service logs and parts/labor cost breakdowns.",
        ),
        tools=("inspect_home_appliance_maintenance",),
        permitted_data=("assets", "appliances", "maintenance_records", "reminders"),
        input_schema_name="DomainAgentInput",
        output_schema_name="DomainAgentOutput",
        relevant_entities=("Asset", "Appliance", "MaintenanceRecord", "Reminder"),
        relevant_events=(
            "maintenance.service.due_soon",
            "maintenance.work_order.logged",
        ),
        validation_rules=(
            "Days remaining until service must be computed deterministically from `next_service_due_date - current_date`.",
            "Troubleshooting steps must be marked as `is_estimate_or_suggestion=True`.",
        ),
        failure_behavior=(
            "Return the deterministic list of overdue and upcoming `appliances` and `maintenance_records`."
        ),
        system_prompt=(
            "You are the HomeIQ Home Maintenance Agent. Report exact service dates and costs from PostgreSQL "
            "and clearly label preventive advice as suggestions."
        ),
    ),
    HouseholdDomainId.BILLS_UTILITIES: DomainAgentSpec(
        domain=HouseholdDomainId.BILLS_UTILITIES,
        agent_name="Bills & Utilities Agent",
        responsibilities=(
            "Monitor utility bills (electricity, water, gas, broadband) for due dates, consumption units (kWh), and effective unit rates.",
            "Track recurring subscription renewals and autopay configurations.",
            "Enforce Human-in-the-Loop approval before initiating any external bill payment.",
        ),
        tools=("audit_utility_bills_and_subscriptions", "dispatch_external_utility_bill_payment"),
        permitted_data=("bills", "subscriptions", "documents", "expenses"),
        input_schema_name="DomainAgentInput",
        output_schema_name="DomainAgentOutput",
        relevant_entities=("Bill", "Subscription", "Document"),
        relevant_events=(
            "bill.due_date.approaching",
            "bill.payment.approval_requested",
            "bill.payment.dispatched",
        ),
        validation_rules=(
            "Effective tariff rate (`amount_due / units_consumed`) is computed deterministically in Python/SQL.",
            "Calling `dispatch_external_utility_bill_payment` MUST trigger a `HUMAN_APPROVAL_REQUIRED` interrupt.",
        ),
        failure_behavior=(
            "Return unpaid `bills` and active `subscriptions` sorted by `due_date` ascending."
        ),
        system_prompt=(
            "You are the HomeIQ Bills & Utilities Agent. Never invent meter readings or bill amounts, "
            "and never execute external payments without human authorization."
        ),
    ),
    HouseholdDomainId.EXPENSE_BUDGET: DomainAgentSpec(
        domain=HouseholdDomainId.EXPENSE_BUDGET,
        agent_name="Expense & Budget Agent",
        responsibilities=(
            "Compute household budget utilization, category-wise expenditure rollups, and remaining monthly runway using SQL.",
            "Track asset-linked expenses to support Total Cost of Ownership (TCO) analysis.",
            "Provide clearly separated savings suggestions based on deterministic spend variance.",
        ),
        tools=("compute_household_budget_and_ledger_variance",),
        permitted_data=("households", "expenses", "bills", "subscriptions"),
        input_schema_name="DomainAgentInput",
        output_schema_name="DomainAgentOutput",
        relevant_entities=("Household", "Expense", "Bill", "Subscription"),
        relevant_events=(
            "budget.threshold.exceeded",
            "expense.ledger.reconciled",
        ),
        validation_rules=(
            "All sums, percentages, and remaining balances must come exclusively from `FinanceRepository` SQL aggregations.",
            "Budget optimization tips must be placed in `estimates_or_suggestions` with `is_estimate_or_suggestion=True`.",
        ),
        failure_behavior=(
            "Return the deterministic `summarize_monthly_spend` SQL dictionary without commentary."
        ),
        system_prompt=(
            "You are the HomeIQ Expense & Budget Agent. You never perform mental arithmetic; "
            "you report exact minor-unit SQL totals and separate budget advice from ledger facts."
        ),
    ),
    HouseholdDomainId.VEHICLE_MOBILITY: DomainAgentSpec(
        domain=HouseholdDomainId.VEHICLE_MOBILITY,
        agent_name="Vehicle & Mobility Agent",
        responsibilities=(
            "Monitor vehicle odometer readings against periodic service intervals (`service_interval_km`).",
            "Track statutory compliance expiries including Pollution Under Control (PUC) and registration validity.",
            "Calculate deterministic vehicle Total Cost of Ownership (purchase + maintenance + direct expenses).",
        ),
        tools=("inspect_vehicle_fleet_and_compliance",),
        permitted_data=("assets", "vehicles", "maintenance_records", "insurance_policies", "expenses"),
        input_schema_name="DomainAgentInput",
        output_schema_name="DomainAgentOutput",
        relevant_entities=("Asset", "Vehicle", "MaintenanceRecord", "InsurancePolicy", "Expense"),
        relevant_events=(
            "vehicle.service_km.approaching",
            "vehicle.puc_expiry.warning",
        ),
        validation_rules=(
            "Remaining kilometers to service (`service_interval_km - (odometer_km - last_service_odometer_km)`) is computed deterministically.",
            "Service cost estimates must be marked `is_estimate_or_suggestion=True`.",
        ),
        failure_behavior=(
            "Return deterministic vehicle odometer and compliance records from `vehicles`."
        ),
        system_prompt=(
            "You are the HomeIQ Vehicle & Mobility Agent. Report exact odometer metrics, PUC dates, "
            "and TCO figures from PostgreSQL."
        ),
    ),
}


class SharedDomainAgentExecutor:
    """
    Executes any of the 7 domain agents using the shared tool registry,
    shared database session, and shared policy validation layer.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.policy = PolicyValidationLayer()

    async def execute_agent(self, agent_input: DomainAgentInput) -> DomainAgentOutput:
        spec = DOMAIN_AGENT_SPECS[agent_input.domain]
        query_lower = agent_input.user_query.lower()

        invoked_tools: list[str] = []
        emitted_events: list[str] = []
        recorded_facts: list[RecordedHouseholdFact] = []
        recommendations: list[AgentRecommendation] = []
        deterministic_metrics: dict[str, Any] = {}

        try:
            # Select primary read tool for the domain
            primary_tool_name = spec.tools[0]
            requires_approval, _ = self.policy.verify_tool_permission(
                agent_domain=spec.domain,
                tool_name=primary_tool_name,
                permitted_tables=spec.permitted_data,
            )

            tool_def = SHARED_TOOL_REGISTRY[primary_tool_name]
            tool_result = await tool_def.handler(
                self.session,
                agent_input.household_id,
                {"query": agent_input.user_query, **agent_input.parameters},
            )
            invoked_tools.append(primary_tool_name)
            deterministic_metrics.update(tool_result.get("metrics", {}))

            for raw_fact in tool_result.get("facts", []):
                recorded_facts.append(RecordedHouseholdFact.model_validate(raw_fact))

            # Check if user requested an action that triggers a secondary mutation or external tool
            if (
                spec.domain == HouseholdDomainId.BILLS_UTILITIES
                and any(kw in query_lower for kw in ("pay ", "settle ", "dispatch payment", "initiate payment"))
            ):
                ext_tool_name = "dispatch_external_utility_bill_payment"
                needs_approval, _ = self.policy.verify_tool_permission(
                    agent_domain=spec.domain,
                    tool_name=ext_tool_name,
                    permitted_tables=spec.permitted_data,
                )
                if needs_approval and not agent_input.parameters.get("human_approved", False):
                    interrupt_payload = build_approval_interrupt_payload(
                        domain=spec.domain,
                        tool_name=ext_tool_name,
                        arguments={
                            "household_id": str(agent_input.household_id),
                            "unpaid_bills_total_minor": deterministic_metrics.get(
                                "unpaid_bills_total_minor", 0
                            ),
                        },
                        reason=(
                            "Initiating an external utility bill payment is classified as "
                            "EXTERNAL_CONSEQUENTIAL and requires explicit human authorization."
                        ),
                    )
                    recommendations.append(
                        AgentRecommendation(
                            title="Authorize External Utility Bill Payment",
                            recommendation_text=(
                                "Review the verified MSEDCL bill amount and approve external payment dispatch."
                            ),
                            is_estimate_or_suggestion=True,
                            basis_or_assumption="Grounded in pending `bills` record.",
                            proposed_action_tool=ext_tool_name,
                            risk_level=ActionRiskLevel.EXTERNAL_CONSEQUENTIAL,
                        )
                    )
                    output = DomainAgentOutput(
                        domain=spec.domain,
                        agent_name=spec.agent_name,
                        summary_answer=(
                            "Verified pending utility bill in PostgreSQL. External payment execution "
                            "is paused awaiting mandatory Human-in-the-Loop approval."
                        ),
                        recorded_facts=recorded_facts,
                        estimates_or_suggestions=recommendations,
                        deterministic_metrics=deterministic_metrics,
                        invoked_tools=invoked_tools,
                        emitted_events=["bill.payment.approval_requested"],
                        requires_human_approval=True,
                        pending_approval_payload=interrupt_payload,
                    )
                    return self.policy.validate_agent_output(
                        output, permitted_tables=spec.permitted_data
                    )

            if (
                spec.domain == HouseholdDomainId.KITCHEN_GROCERY
                and any(kw in query_lower for kw in ("restock", "add to grocery", "replenish"))
            ):
                mut_tool = SHARED_TOOL_REGISTRY["add_replenishment_grocery_item"]
                self.policy.verify_tool_permission(
                    agent_domain=spec.domain,
                    tool_name=mut_tool.name,
                    permitted_tables=spec.permitted_data,
                )
                mut_res = await mut_tool.handler(
                    self.session,
                    agent_input.household_id,
                    agent_input.parameters,
                )
                invoked_tools.append(mut_tool.name)
                for rf in mut_res.get("facts", []):
                    recorded_facts.append(RecordedHouseholdFact.model_validate(rf))
                if mut_res.get("emitted_event"):
                    emitted_events.append(mut_res["emitted_event"])

            # Construct domain-grounded summary and clearly separated suggestion
            summary_answer, domain_rec = self._build_grounded_synthesis(
                spec=spec,
                facts=recorded_facts,
                metrics=deterministic_metrics,
            )
            recommendations.append(domain_rec)
            emitted_events.append(spec.relevant_events[0])

            output = DomainAgentOutput(
                domain=spec.domain,
                agent_name=spec.agent_name,
                summary_answer=summary_answer,
                recorded_facts=recorded_facts,
                estimates_or_suggestions=recommendations,
                deterministic_metrics=deterministic_metrics,
                invoked_tools=invoked_tools,
                emitted_events=emitted_events,
                requires_human_approval=False,
            )
            return self.policy.validate_agent_output(output, permitted_tables=spec.permitted_data)

        except Exception as exc:
            # Deterministic Failure Behavior defined in spec
            return DomainAgentOutput(
                domain=spec.domain,
                agent_name=spec.agent_name,
                summary_answer=f"Executed deterministic fallback for {spec.agent_name}.",
                recorded_facts=recorded_facts,
                estimates_or_suggestions=[],
                deterministic_metrics=deterministic_metrics,
                invoked_tools=invoked_tools,
                emitted_events=["agent.execution.fallback"],
                validation_passed=False,
                fallback_or_failure_note=f"{spec.failure_behavior} (Reason: {exc})",
            )

    @staticmethod
    def _build_grounded_synthesis(
        *,
        spec: DomainAgentSpec,
        facts: list[RecordedHouseholdFact],
        metrics: dict[str, Any],
    ) -> tuple[str, AgentRecommendation]:
        domain = spec.domain
        if domain == HouseholdDomainId.DOCUMENTS_WARRANTY:
            w_count = metrics.get("active_warranties_count", 0)
            p_count = metrics.get("insurance_policies_count", 0)
            summary = (
                f"Retrieved {w_count} active warranty contract(s), {p_count} insurance policy record(s), "
                f"and {metrics.get('retrieved_documents_count', 0)} cited vault document(s) from PostgreSQL."
            )
            rec = AgentRecommendation(
                title="Schedule Pre-Expiry Warranty Inspection",
                recommendation_text=(
                    "Suggestion: Book a preventive checkup 30 days prior to warranty expiration "
                    "so any covered pump or PCB wear is claimed at zero labor/parts cost."
                ),
                basis_or_assumption="Derived from recorded warranty `end_date` and `covers_parts=True`.",
            )
            return summary, rec

        if domain == HouseholdDomainId.KITCHEN_GROCERY:
            low_cnt = metrics.get("low_or_expiring_count", 0)
            est_minor = metrics.get("deterministic_shopping_cart_estimate_minor", 0)
            summary = (
                f"Pantry check complete: {low_cnt} inventory item(s) at or below reorder threshold; "
                f"deterministic pending shopping list total is ₹{est_minor / 100:,.2f}."
            )
            rec = AgentRecommendation(
                title="Suggested Weekly Replenishment & FIFO Usage",
                recommendation_text=(
                    f"Estimate: Replenishing low-stock staples is projected at ₹{est_minor / 100:,.2f} "
                    "based on recorded unit prices. Prioritize consuming open grain batches first."
                ),
                basis_or_assumption="Calculated from `planned_quantity * estimated_unit_price_minor`.",
            )
            return summary, rec

        if domain == HouseholdDomainId.LAUNDRY_CLOTHING:
            dc_cnt = metrics.get("dry_clean_only_count", 0)
            summary = (
                f"Audited {metrics.get('total_garments', 0)} wardrobe item(s); "
                f"{dc_cnt} item(s) require strict DRY_CLEAN_ONLY handling."
            )
            rec = AgentRecommendation(
                title="Separate Delicate Silk & Zari Fabrics",
                recommendation_text=(
                    "Suggestion: Keep dry-clean-only silk garments isolated from warm machine cycles "
                    "to prevent zari oxidation and shrinkage."
                ),
                basis_or_assumption="Based on recorded `wash_care_method=DRY_CLEAN_ONLY` in `clothing_items`.",
            )
            return summary, rec

        if domain == HouseholdDomainId.HOME_MAINTENANCE:
            schedules = metrics.get("upcoming_service_schedules", [])
            summary = (
                f"Monitored {metrics.get('appliances_monitored', 0)} appliance(s) and "
                f"{metrics.get('maintenance_records_count', 0)} historical service record(s)."
            )
            rec = AgentRecommendation(
                title="Preventive Descaling & Filter Calibration",
                recommendation_text=(
                    f"Suggestion: {len(schedules)} appliance schedule(s) tracked; maintain biannual "
                    "descaling intervals for hard municipal water."
                ),
                basis_or_assumption="Derived from recorded `service_interval_days` and `next_service_due_date`.",
            )
            return summary, rec

        if domain == HouseholdDomainId.BILLS_UTILITIES:
            unpaid = metrics.get("unpaid_bills_total_minor", 0)
            sub_m = metrics.get("active_subscriptions_monthly_minor", 0)
            summary = (
                f"Deterministic utility audit: ₹{unpaid / 100:,.2f} in unpaid utility bills and "
                f"₹{sub_m / 100:,.2f}/month in active recurring subscriptions."
            )
            rec = AgentRecommendation(
                title="Peak-Hour Load Shifting Opportunity",
                recommendation_text=(
                    "Suggestion: Running high-wattage appliances (dishwasher/water heater) during non-peak "
                    "hours can reduce next cycle's slab consumption."
                ),
                basis_or_assumption="Advisory estimate based on recorded kWh consumption in `bills`.",
            )
            return summary, rec

        if domain == HouseholdDomainId.EXPENSE_BUDGET:
            budget = metrics.get("household_monthly_budget_minor", 0)
            spent = metrics.get("total_recorded_spend_minor", 0)
            pct = metrics.get("budget_utilization_percent", 0.0)
            summary = (
                f"SQL Ledger Summary: Recorded spend is ₹{spent / 100:,.2f} against a monthly budget "
                f"of ₹{budget / 100:,.2f} ({pct}% utilization)."
            )
            rec = AgentRecommendation(
                title="Projected Monthly Savings Runway",
                recommendation_text=(
                    f"Estimate: Remaining unallocated budget envelope is ₹{(budget - spent) / 100:,.2f}. "
                    "Consider earmarking 15% for upcoming annual insurance renewals."
                ),
                basis_or_assumption="Derived deterministically from `monthly_budget_minor - sum(expenses.amount_minor)`.",
            )
            return summary, rec

        # VEHICLE_MOBILITY
        fleet = metrics.get("fleet_telemetry", [])
        summary = f"Evaluated {len(fleet)} registered household vehicle(s) with deterministic odometer and TCO metrics."
        rec = AgentRecommendation(
            title="Upcoming Periodic Service & PUC Renewal Buffer",
            recommendation_text=(
                "Suggestion: Schedule periodic maintenance 500 km before the interval limit and renew "
                "PUC certification 14 days prior to expiry."
            ),
            basis_or_assumption="Based on recorded `odometer_km`, `service_interval_km`, and `pollution_cert_expiry_date`.",
        )
        return summary, rec
