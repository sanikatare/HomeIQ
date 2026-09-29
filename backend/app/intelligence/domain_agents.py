"""
HomeIQ — Household Domain Agents (Shared LangGraph + Gemini Infrastructure).

Defines explicit specifications and execution logic for the 7 household domain agents:
 1. Kitchen & Grocery Agent (`kitchen_grocery`)
 2. Laundry & Clothing Agent (`laundry_clothing`)
 3. Home Maintenance Agent (`home_maintenance`)
 4. Finance & Household Expenses Agent (`finance_expenses`)
 5. Vehicle & Mobility Agent (`vehicle_mobility`)
 6. Documents, Warranty & Insurance Agent (`documents_warranty`)
 7. Parents' Health Monitoring Agent (`parents_health`)

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
    HouseholdDomainId.FINANCE_EXPENSES: DomainAgentSpec(
        domain=HouseholdDomainId.FINANCE_EXPENSES,
        agent_name="Finance & Household Expenses Agent",
        responsibilities=(
            "Monitor bills and utilities (electricity, water, gas, broadband), due dates, recurring bills, and subscription renewals.",
            "Track household expenses, expenditure, budget management, payments and payment history, expense tracking, and spending summaries using deterministic SQL.",
            "Generate financial reminders for upcoming due dates and enforce Human-in-the-Loop approval before initiating any external bill payment.",
        ),
        tools=(
            "audit_utility_bills_and_subscriptions",
            "compute_household_budget_and_ledger_variance",
            "dispatch_external_utility_bill_payment",
        ),
        permitted_data=("households", "bills", "subscriptions", "documents", "expenses", "reminders"),
        input_schema_name="DomainAgentInput",
        output_schema_name="DomainAgentOutput",
        relevant_entities=("Household", "Bill", "Subscription", "Expense", "Document", "Reminder"),
        relevant_events=(
            "bill.due_date.approaching",
            "bill.payment.approval_requested",
            "bill.payment.dispatched",
            "budget.threshold.exceeded",
            "expense.ledger.reconciled",
        ),
        validation_rules=(
            "All sums, percentages, tariff rates, spending summaries, and remaining budget balances must come exclusively from SQL/Python aggregations.",
            "Calling `dispatch_external_utility_bill_payment` MUST trigger a `HUMAN_APPROVAL_REQUIRED` interrupt.",
        ),
        failure_behavior=(
            "Return unpaid `bills`, active `subscriptions`, payment history, financial reminders, and deterministic monthly spend totals."
        ),
        system_prompt=(
            "You are the HomeIQ Finance & Household Expenses Agent. You manage bills and utilities, "
            "household expenses, expenditure, budget management, payments and payment history, due dates, "
            "recurring bills, expense tracking, spending summaries, and financial reminders. "
            "Never invent amounts or execute external payments without human authorization."
        ),
    ),
    HouseholdDomainId.PARENTS_HEALTH: DomainAgentSpec(
        domain=HouseholdDomainId.PARENTS_HEALTH,
        agent_name="Parents' Health Monitoring Agent",
        responsibilities=(
            "Record, organize, retrieve, and track parents' monthly/periodic checkups, doctor appointments, and follow-up dates.",
            "Index and retrieve lab-test records, medical reports, vaccination/screening records, and explicitly recorded health measurements.",
            "Track medication schedules and generate upcoming checkup and health-related reminders strictly without diagnosis, disease prediction, treatment recommendations, or medical decision-making.",
        ),
        tools=(
            "retrieve_parents_health_records_and_schedules",
            "log_parent_health_checkup_or_reminder",
        ),
        permitted_data=(
            "parent_health_records",
            "documents",
            "reminders",
            "notifications",
            "household_members",
        ),
        input_schema_name="DomainAgentInput",
        output_schema_name="DomainAgentOutput",
        relevant_entities=(
            "ParentHealthRecord",
            "Document",
            "Reminder",
            "Notification",
            "HouseholdMember",
        ),
        relevant_events=(
            "health.checkup.reminder_scheduled",
            "health.record.logged",
            "health.appointment.upcoming",
        ),
        validation_rules=(
            "Strictly limited to monitoring, organization, retrieval, and reminders of explicitly recorded health data.",
            "Never perform medical diagnosis, disease prediction, treatment recommendation, or clinical decision-making.",
        ),
        failure_behavior=(
            "Return recorded parent checkup dates, medication schedules, and lab report citations without clinical interpretation."
        ),
        system_prompt=(
            "You are the HomeIQ Parents' Health Monitoring Agent. Help users record, organize, retrieve, "
            "track, and remind about their parents' checkups, doctor visits, lab reports, medication schedules, "
            "vaccinations, and recorded measurements. Do not diagnose, predict disease, or recommend treatments."
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
    HouseholdDomainId.TRAVEL_RECORDS: DomainAgentSpec(
        domain=HouseholdDomainId.TRAVEL_RECORDS,
        agent_name="Travel Records Agent",
        responsibilities=(
            "Record, organize, retrieve, and track past and upcoming household trips, travel dates, and destinations.",
            "Organize flight, train, bus, and hotel/accommodation bookings, travel documents, and travel expenses/receipts.",
            "Track trip timelines and generate reminders for upcoming trips and important travel documents.",
        ),
        tools=("retrieve_travel_records_and_bookings",),
        permitted_data=("documents", "expenses", "reminders", "households"),
        input_schema_name="DomainAgentInput",
        output_schema_name="DomainAgentOutput",
        relevant_entities=("Document", "Expense", "Reminder", "Household"),
        relevant_events=(
            "travel.trip.reminder_scheduled",
            "travel.document.indexed",
        ),
        validation_rules=(
            "Every trip booking, travel document, or travel expense statement must cite a recorded database UUID.",
            "Keep primary focus strictly on organizing and retrieving household travel records rather than speculative travel planning.",
        ),
        failure_behavior=(
            "Return recorded travel documents, trip reminders, and travel expenses directly from PostgreSQL."
        ),
        system_prompt=(
            "You are the HomeIQ Travel Records Agent. Help users record, organize, retrieve, and track "
            "past and upcoming trips, bookings, hotels, travel documents, travel expenses, and trip reminders."
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

            # For Finance & Household Expenses, also run the deterministic budget & expense ledger tool
            if spec.domain == HouseholdDomainId.FINANCE_EXPENSES:
                ledger_tool_name = "compute_household_budget_and_ledger_variance"
                self.policy.verify_tool_permission(
                    agent_domain=spec.domain,
                    tool_name=ledger_tool_name,
                    permitted_tables=spec.permitted_data,
                )
                ledger_tool_def = SHARED_TOOL_REGISTRY[ledger_tool_name]
                ledger_result = await ledger_tool_def.handler(
                    self.session,
                    agent_input.household_id,
                    {"query": agent_input.user_query, **agent_input.parameters},
                )
                invoked_tools.append(ledger_tool_name)
                deterministic_metrics.update(ledger_result.get("metrics", {}))
                for raw_fact in ledger_result.get("facts", []):
                    recorded_facts.append(RecordedHouseholdFact.model_validate(raw_fact))

            # Check if user requested an action that triggers a secondary mutation or external tool
            if (
                spec.domain == HouseholdDomainId.FINANCE_EXPENSES
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

            if (
                spec.domain == HouseholdDomainId.PARENTS_HEALTH
                and any(kw in query_lower for kw in ("record ", "log ", "add checkup", "schedule checkup"))
            ):
                mut_tool = SHARED_TOOL_REGISTRY["log_parent_health_checkup_or_reminder"]
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

        if domain == HouseholdDomainId.FINANCE_EXPENSES:
            unpaid = metrics.get("unpaid_bills_total_minor", 0)
            sub_m = metrics.get("active_subscriptions_monthly_minor", 0)
            budget = metrics.get("household_monthly_budget_minor", 8500000)
            spent = metrics.get("total_recorded_spend_minor", 0)
            summary = (
                f"Finance & Household Expenses Summary: ₹{unpaid / 100:,.2f} in unpaid utility bills, "
                f"₹{sub_m / 100:,.2f}/month in recurring subscriptions, and ₹{spent / 100:,.2f} recorded "
                f"against the ₹{budget / 100:,.2f} monthly budget."
            )
            rec = AgentRecommendation(
                title="Upcoming Due Dates & Budget Runway Reminder",
                recommendation_text=(
                    "Reminder: Review pending utility bills before their due dates and maintain "
                    "a 15% monthly budget buffer for recurring household obligations."
                ),
                basis_or_assumption="Derived deterministically from `bills`, `subscriptions`, and `expenses`.",
            )
            return summary, rec

        if domain == HouseholdDomainId.PARENTS_HEALTH:
            rec_cnt = metrics.get("parent_health_records_count", 0)
            up_cnt = metrics.get("upcoming_checkups_count", 0)
            rem_cnt = metrics.get("health_reminders_count", 0)
            doc_cnt = metrics.get("retrieved_health_documents_count", 0)
            summary = (
                f"Parents' Health Monitoring Summary: Retrieved {rec_cnt} structured health record(s) "
                f"({up_cnt} upcoming checkup/follow-up date(s)), {rem_cnt} active health reminder(s), "
                f"and {doc_cnt} cited lab/medical report(s) from the household vault. "
                f"(Strictly record monitoring only — no medical diagnosis or treatment advice)."
            )
            rec = AgentRecommendation(
                title="Upcoming Checkup & Lab Follow-Up Reminder",
                recommendation_text=(
                    "Schedule Reminder: Carry the recorded Golwilkar Metropolis lab panel report and current "
                    "medication schedule log to the next scheduled physician checkup. (Record tracking only — no medical advice)."
                ),
                basis_or_assumption="Derived strictly from recorded appointment dates, medication schedules, and uploaded lab report metadata.",
            )
            return summary, rec

        if domain == HouseholdDomainId.TRAVEL_RECORDS:
            doc_cnt = metrics.get("travel_documents_count", 0)
            rem_cnt = metrics.get("travel_reminders_count", 0)
            exp_m = metrics.get("recorded_travel_expenses_minor", 0)
            summary = (
                f"Travel Records Summary: Retrieved {doc_cnt} travel/booking document(s), "
                f"{rem_cnt} trip/document reminder(s), and ₹{exp_m / 100:,.2f} in recorded household expenses."
            )
            rec = AgentRecommendation(
                title="Upcoming Trip & Travel Document Checklist Reminder",
                recommendation_text=(
                    "Reminder: Verify boarding passes, hotel confirmation vouchers, and ID documents "
                    "48 hours before scheduled trip departure dates."
                ),
                basis_or_assumption="Derived from recorded travel documents and scheduled reminders.",
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
