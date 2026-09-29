"""
HomeIQ — Proactive Intelligence Layer.

Evaluates household state and domain events to generate grounded, actionable insights:
 1. UPCOMING_BILL
 2. EXPIRING_WARRANTY
 3. EXPIRING_INSURANCE
 4. MAINTENANCE_DUE
 5. LOW_INVENTORY
 6. RECURRING_EXPENSE
 7. UNUSUAL_SPENDING_CHANGE
 8. HOUSEHOLD_FOLLOW_UP

Invariants:
 - Uses deterministic SQL/Python rules wherever the trigger condition is deterministic.
 - Uses Gemini reasoning only when narrative interpretation of multi-factor anomalies is needed.
 - Every insight includes `type`, `explanation`, `supporting_household_data`,
   `confidence_score`, `uncertainty_note`, `created_at`, `status`, and optional `recommended_action`.
 - Never presents an unsupported inference as a recorded fact.
 - Emits Reminders and Notifications without automatically executing consequential external actions.
"""
from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone
try:
    from enum import StrEnum
except ImportError:
    from enum import Enum

    class StrEnum(str, Enum):  # type: ignore[no-redef]
        pass
from typing import Any

from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.observability import (
    PROACTIVE_DUPLICATES_PREVENTED_TOTAL,
    PROACTIVE_INSIGHTS_GENERATED_TOTAL,
    PROACTIVE_INSIGHTS_STATUS_TOTAL,
    PROACTIVE_RULE_FAILURES_TOTAL,
)
from app.db.enums import (
    ActionRiskLevel,
    AgentRunStatus,
    BillStatus,
    NotificationChannel,
    NotificationStatus,
    ReminderPriority,
    ReminderStatus,
    SubscriptionStatus,
    WarrantyStatus,
)
from app.db.models import Notification, Reminder
from app.intelligence.schemas import AgentRecommendation, RecordedHouseholdFact
from app.repositories.household_repositories import RepositoryRegistry


class ProactiveInsightType(StrEnum):
    UPCOMING_BILL = "UPCOMING_BILL"
    EXPIRING_WARRANTY = "EXPIRING_WARRANTY"
    EXPIRING_INSURANCE = "EXPIRING_INSURANCE"
    MAINTENANCE_DUE = "MAINTENANCE_DUE"
    LOW_INVENTORY = "LOW_INVENTORY"
    RECURRING_EXPENSE = "RECURRING_EXPENSE"
    UNUSUAL_SPENDING_CHANGE = "UNUSUAL_SPENDING_CHANGE"
    HOUSEHOLD_FOLLOW_UP = "HOUSEHOLD_FOLLOW_UP"


class InsightStatus(StrEnum):
    ACTIVE = "ACTIVE"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    RESOLVED = "RESOLVED"
    DISMISSED = "DISMISSED"


class ProactiveInsight(BaseModel):
    model_config = ConfigDict(extra="forbid")

    insight_id: uuid.UUID = Field(default_factory=uuid.uuid4)
    household_id: uuid.UUID
    insight_type: ProactiveInsightType
    title: str
    explanation: str
    supporting_household_data: list[RecordedHouseholdFact]
    is_deterministic_rule: bool = True
    confidence_score: float = Field(ge=0.0, le=1.0, default=1.0)
    uncertainty_note: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: InsightStatus = InsightStatus.ACTIVE
    recommended_action: AgentRecommendation | None = None
    created_reminder_id: uuid.UUID | None = None
    created_notification_id: uuid.UUID | None = None


class ProactiveEvaluationReport(BaseModel):
    household_id: uuid.UUID
    reference_date: date
    evaluated_at: datetime
    insights_count: int
    reminders_created: int
    notifications_created: int
    insights: list[ProactiveInsight]


class ProactiveIntelligenceEngine:
    """
    Evaluates household relational state and emits structured `ProactiveInsight` objects
    alongside non-destructive `Reminder` and `Notification` records.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repos = RepositoryRegistry(session)

    async def evaluate_household(
        self,
        *,
        household_id: uuid.UUID,
        recipient_user_id: uuid.UUID,
        reference_date: date | None = None,
        persist_reminders_and_notifications: bool = True,
    ) -> ProactiveEvaluationReport:
        today = reference_date or date.today()
        insights: list[ProactiveInsight] = []
        reminders_created = 0
        notifications_created = 0

        # 1. UPCOMING_BILL (Deterministic: unpaid bills due within 14 days or overdue)
        bills, _ = await self.repos.bills.list_for_household(household_id, limit=100)
        for bill in bills:
            if bill.status in {BillStatus.PENDING_PAYMENT, BillStatus.OVERDUE, BillStatus.UPCOMING}:
                days_to_due = (bill.due_date - today).days
                if days_to_due <= 14:
                    insights.append(
                        ProactiveInsight(
                            household_id=household_id,
                            insight_type=ProactiveInsightType.UPCOMING_BILL,
                            title=f"Upcoming {bill.category.value} Bill — {bill.provider_name}",
                            explanation=(
                                f"Recorded fact: Bill #{bill.invoice_number or bill.consumer_account_number} "
                                f"for ₹{bill.amount_due_minor / 100:,.2f} is due on {bill.due_date.isoformat()} "
                                f"({days_to_due} day(s) from reference date)."
                            ),
                            supporting_household_data=[
                                RecordedHouseholdFact(
                                    source_table="bills",
                                    record_id=str(bill.id),
                                    field_or_metric="amount_due_minor & due_date",
                                    recorded_value=f"{bill.amount_due_minor} minor units due {bill.due_date}",
                                    is_deterministic_calculation=True,
                                )
                            ],
                            is_deterministic_rule=True,
                            confidence_score=1.0,
                            recommended_action=AgentRecommendation(
                                title="Review & Authorize Utility Payment",
                                recommendation_text=(
                                    "Suggestion: Verify meter units and approve payment before due date. "
                                    "(External payment is never executed automatically)."
                                ),
                                basis_or_assumption="Deterministic due-date window <= 14 days.",
                                proposed_action_tool="dispatch_external_utility_bill_payment",
                                risk_level=ActionRiskLevel.EXTERNAL_CONSEQUENTIAL,
                            ),
                        )
                    )

        # 2. EXPIRING_WARRANTY (Deterministic: active warranties expiring within 60 days)
        warranties, _ = await self.repos.warranties.list_for_household(household_id, limit=100)
        for w in warranties:
            days_left = (w.end_date - today).days
            if w.status == WarrantyStatus.ACTIVE and 0 <= days_left <= 60:
                insights.append(
                    ProactiveInsight(
                        household_id=household_id,
                        insight_type=ProactiveInsightType.EXPIRING_WARRANTY,
                        title=f"Expiring Warranty — {w.provider_name}",
                        explanation=(
                            f"Recorded fact: Warranty contract {w.contract_or_policy_number or w.id} "
                            f"expires on {w.end_date.isoformat()} ({days_left} days remaining)."
                        ),
                        supporting_household_data=[
                            RecordedHouseholdFact(
                                source_table="warranties",
                                record_id=str(w.id),
                                field_or_metric="end_date",
                                recorded_value=w.end_date.isoformat(),
                                is_deterministic_calculation=True,
                            )
                        ],
                        is_deterministic_rule=True,
                        confidence_score=1.0,
                        recommended_action=AgentRecommendation(
                            title="Book Pre-Expiry Inspection",
                            recommendation_text="Suggestion: Schedule a preventive checkup before coverage lapses.",
                            basis_or_assumption="Warranty end_date within 60-day window.",
                        ),
                    )
                )

        # 3. EXPIRING_INSURANCE (Deterministic: active policies expiring within 45 days)
        policies, _ = await self.repos.insurance.list_for_household(household_id, limit=100)
        for pol in policies:
            days_left = (pol.end_date - today).days
            if pol.is_active and 0 <= days_left <= 45:
                insights.append(
                    ProactiveInsight(
                        household_id=household_id,
                        insight_type=ProactiveInsightType.EXPIRING_INSURANCE,
                        title=f"Insurance Renewal Approaching — {pol.insurer_name}",
                        explanation=(
                            f"Recorded fact: Policy #{pol.policy_number} ({pol.insurance_type.value}) "
                            f"with Sum Insured ₹{pol.sum_insured_minor / 100:,.2f} expires on "
                            f"{pol.end_date.isoformat()} ({days_left} days remaining)."
                        ),
                        supporting_household_data=[
                            RecordedHouseholdFact(
                                source_table="insurance_policies",
                                record_id=str(pol.id),
                                field_or_metric="policy_number & end_date",
                                recorded_value=f"{pol.policy_number} expires {pol.end_date}",
                                is_deterministic_calculation=True,
                            )
                        ],
                        is_deterministic_rule=True,
                        confidence_score=1.0,
                        recommended_action=AgentRecommendation(
                            title="Compare No-Claim Bonus (NCB) Renewal Quotes",
                            recommendation_text="Suggestion: Request renewal quotes 15 days before policy expiry to preserve NCB.",
                            basis_or_assumption="Insurance end_date within 45-day window.",
                        ),
                    )
                )

        # 4. MAINTENANCE_DUE (Deterministic: appliance next_service_due_date <= 21 days or vehicle km interval)
        appliances, _ = await self.repos.appliances.list_for_household(household_id, limit=100)
        for app in appliances:
            if app.next_service_due_date:
                days_to_service = (app.next_service_due_date - today).days
                if days_to_service <= 21:
                    insights.append(
                        ProactiveInsight(
                            household_id=household_id,
                            insight_type=ProactiveInsightType.MAINTENANCE_DUE,
                            title=f"Appliance Preventive Maintenance Due ({app.appliance_type.value})",
                            explanation=(
                                f"Recorded fact: Appliance asset {app.asset_id} has next_service_due_date "
                                f"on {app.next_service_due_date.isoformat()} ({days_to_service} days remaining)."
                            ),
                            supporting_household_data=[
                                RecordedHouseholdFact(
                                    source_table="appliances",
                                    record_id=str(app.id),
                                    field_or_metric="next_service_due_date",
                                    recorded_value=app.next_service_due_date.isoformat(),
                                    is_deterministic_calculation=True,
                                )
                            ],
                            is_deterministic_rule=True,
                            confidence_score=1.0,
                            recommended_action=AgentRecommendation(
                                title="Log Preventive Maintenance Work Order",
                                recommendation_text="Suggestion: Schedule authorized service technician visit.",
                                basis_or_assumption="Based on recorded `service_interval_days`.",
                            ),
                        )
                    )

        vehicles, _ = await self.repos.vehicles.list_for_household(household_id, limit=100)
        for veh in vehicles:
            km_used = veh.odometer_km - veh.last_service_odometer_km
            km_left = veh.service_interval_km - km_used
            if km_left <= 2000:
                insights.append(
                    ProactiveInsight(
                        household_id=household_id,
                        insight_type=ProactiveInsightType.MAINTENANCE_DUE,
                        title=f"Vehicle Service Interval Approaching ({veh.registration_number})",
                        explanation=(
                            f"Recorded fact: Vehicle {veh.registration_number} has traveled {km_used} km "
                            f"since last service ({km_left} km remaining before {veh.service_interval_km} km interval)."
                        ),
                        supporting_household_data=[
                            RecordedHouseholdFact(
                                source_table="vehicles",
                                record_id=str(veh.id),
                                field_or_metric="odometer_km & service_interval_km",
                                recorded_value=f"odometer={veh.odometer_km}km, remaining={km_left}km",
                                is_deterministic_calculation=True,
                            )
                        ],
                        is_deterministic_rule=True,
                        confidence_score=1.0,
                        recommended_action=AgentRecommendation(
                            title="Schedule Periodic Vehicle Service",
                            recommendation_text="Suggestion: Book periodic inspection before crossing interval threshold.",
                            basis_or_assumption="Deterministic odometer delta.",
                        ),
                    )
                )

        # 5. LOW_INVENTORY (Deterministic: quantity_on_hand <= reorder_threshold)
        low_stock_items = await self.repos.inventory.list_low_or_expiring(household_id, within_days=14)
        for item in low_stock_items:
            insights.append(
                ProactiveInsight(
                    household_id=household_id,
                    insight_type=ProactiveInsightType.LOW_INVENTORY,
                    title=f"Low Pantry Stock — {item.name}",
                    explanation=(
                        f"Recorded fact: '{item.name}' quantity_on_hand is {item.quantity_on_hand} {item.unit.value}, "
                        f"which is at or below reorder_threshold ({item.reorder_threshold} {item.unit.value})."
                    ),
                    supporting_household_data=[
                        RecordedHouseholdFact(
                            source_table="inventory_items",
                            record_id=str(item.id),
                            field_or_metric="quantity_on_hand <= reorder_threshold",
                            recorded_value=f"{item.quantity_on_hand} <= {item.reorder_threshold} {item.unit.value}",
                            is_deterministic_calculation=True,
                        )
                    ],
                    is_deterministic_rule=True,
                    confidence_score=1.0,
                    recommended_action=AgentRecommendation(
                        title=f"Replenish {item.name}",
                        recommendation_text=f"Suggestion: Add {item.name} to active grocery list.",
                        basis_or_assumption="Inventory threshold rule.",
                        proposed_action_tool="add_replenishment_grocery_item",
                        risk_level=ActionRiskLevel.INTERNAL_MUTATION,
                    ),
                )
            )

        # 6. RECURRING_EXPENSE (Deterministic: active subscriptions renewing within 10 days)
        subs, _ = await self.repos.subscriptions.list_for_household(household_id, limit=100)
        for sub in subs:
            days_to_renewal = (sub.next_renewal_date - today).days
            if sub.status == SubscriptionStatus.ACTIVE and 0 <= days_to_renewal <= 10:
                insights.append(
                    ProactiveInsight(
                        household_id=household_id,
                        insight_type=ProactiveInsightType.RECURRING_EXPENSE,
                        title=f"Recurring Subscription Renewal — {sub.name}",
                        explanation=(
                            f"Recorded fact: Active {sub.billing_cycle.value} subscription '{sub.name}' "
                            f"(₹{sub.recurring_amount_minor / 100:,.2f}) renews on {sub.next_renewal_date.isoformat()}."
                        ),
                        supporting_household_data=[
                            RecordedHouseholdFact(
                                source_table="subscriptions",
                                record_id=str(sub.id),
                                field_or_metric="recurring_amount_minor & next_renewal_date",
                                recorded_value=f"{sub.recurring_amount_minor} minor units on {sub.next_renewal_date}",
                                is_deterministic_calculation=True,
                            )
                        ],
                        is_deterministic_rule=True,
                        confidence_score=1.0,
                    )
                )

        # 7. UNUSUAL_SPENDING_CHANGE (Deterministic SQL variance + calibrated uncertainty note)
        household = await self.repos.households.get_by_id(household_id)
        expenses, _ = await self.repos.expenses.list_for_household(household_id, limit=100)
        if household and expenses:
            total_spend_minor = sum(int(e.amount_minor) for e in expenses)
            avg_tx_minor = total_spend_minor // len(expenses)
            high_outliers = [e for e in expenses if e.amount_minor >= max(50000, int(avg_tx_minor * 1.5))]
            if high_outliers or (
                household.monthly_budget_minor > 0
                and total_spend_minor > int(household.monthly_budget_minor * 0.5)
            ):
                top_exp = max(expenses, key=lambda x: x.amount_minor)
                insights.append(
                    ProactiveInsight(
                        household_id=household_id,
                        insight_type=ProactiveInsightType.UNUSUAL_SPENDING_CHANGE,
                        title=f"Notable Spend Concentration — {top_exp.category.value}",
                        explanation=(
                            f"Recorded fact: Largest recorded transaction is ₹{top_exp.amount_minor / 100:,.2f} "
                            f"at '{top_exp.merchant_name}' ({top_exp.category.value}) on {top_exp.incurred_on}. "
                            f"Total cumulative recorded ledger spend is ₹{total_spend_minor / 100:,.2f}."
                        ),
                        supporting_household_data=[
                            RecordedHouseholdFact(
                                source_table="expenses",
                                record_id=str(top_exp.id),
                                field_or_metric="amount_minor",
                                recorded_value=str(top_exp.amount_minor),
                                is_deterministic_calculation=True,
                            )
                        ],
                        is_deterministic_rule=False,
                        confidence_score=0.86,
                        uncertainty_note=(
                            "Interpretation note: High single-transaction spend may reflect scheduled "
                            "biannual asset maintenance rather than recurring lifestyle drift."
                        ),
                        recommended_action=AgentRecommendation(
                            title="Review Category Envelope Allocation",
                            recommendation_text="Suggestion: Tag irregular asset maintenance expenses to the dedicated sinking fund.",
                            basis_or_assumption="Statistical outlier relative to mean transaction size.",
                        ),
                    )
                )

        # 8. HOUSEHOLD_FOLLOW_UP (Pending human approvals or open high-priority reminders)
        runs, _ = await self.repos.agent_runs.list_for_household(household_id, limit=50)
        pending_approvals = [
            r for r in runs if r.status == AgentRunStatus.AWAITING_HUMAN_APPROVAL
        ]
        reminders, _ = await self.repos.reminders.list_for_household(household_id, limit=50)
        pending_reminders = [r for r in reminders if r.status == ReminderStatus.PENDING]

        if pending_approvals or pending_reminders:
            supporting: list[RecordedHouseholdFact] = []
            for pa in pending_approvals[:2]:
                supporting.append(
                    RecordedHouseholdFact(
                        source_table="agent_runs",
                        record_id=str(pa.id),
                        field_or_metric="status",
                        recorded_value=pa.status.value,
                    )
                )
            for pr in pending_reminders[:2]:
                supporting.append(
                    RecordedHouseholdFact(
                        source_table="reminders",
                        record_id=str(pr.id),
                        field_or_metric=pr.title,
                        recorded_value=f"priority={pr.priority.value}, due={pr.due_at.isoformat()}",
                    )
                )
            insights.append(
                ProactiveInsight(
                    household_id=household_id,
                    insight_type=ProactiveInsightType.HOUSEHOLD_FOLLOW_UP,
                    title="Pending Household Follow-Ups & Action Queue",
                    explanation=(
                        f"Recorded fact: {len(pending_approvals)} agent run(s) awaiting human approval "
                        f"and {len(pending_reminders)} open reminder(s) require attention."
                    ),
                    supporting_household_data=supporting,
                    is_deterministic_rule=True,
                    confidence_score=1.0,
                )
            )

        for ins in insights:
            PROACTIVE_INSIGHTS_GENERATED_TOTAL.labels(
                insight_type=ins.insight_type.value
            ).inc()
            PROACTIVE_INSIGHTS_STATUS_TOTAL.labels(status=ins.status.value).inc()

        # Persist non-destructive Reminders & Notifications for top insights (with duplicate prevention)
        if persist_reminders_and_notifications:
            existing_titles = {
                r.title for r in pending_reminders
            }
            for ins in insights[:3]:
                rem_title = f"[Proactive] {ins.title}"
                if rem_title in existing_titles:
                    PROACTIVE_DUPLICATES_PREVENTED_TOTAL.inc()
                    continue
                existing_titles.add(rem_title)
                rem = Reminder(
                    household_id=household_id,
                    assigned_user_id=recipient_user_id,
                    title=rem_title,
                    description=ins.explanation,
                    domain=ins.insight_type.value.lower(),
                    priority=ReminderPriority.HIGH,
                    status=ReminderStatus.PENDING,
                    due_at=datetime.now(timezone.utc) + timedelta(days=3),
                    created_by_id=recipient_user_id,
                )
                await self.repos.reminders.create(rem)
                ins.created_reminder_id = rem.id
                reminders_created += 1

                notif = Notification(
                    household_id=household_id,
                    recipient_user_id=recipient_user_id,
                    reminder_id=rem.id,
                    channel=NotificationChannel.IN_APP,
                    status=NotificationStatus.UNREAD,
                    title=ins.title,
                    body=ins.explanation,
                    created_by_id=recipient_user_id,
                )
                await self.repos.notifications.create(notif)
                ins.created_notification_id = notif.id
                notifications_created += 1

        return ProactiveEvaluationReport(
            household_id=household_id,
            reference_date=today,
            evaluated_at=datetime.now(timezone.utc),
            insights_count=len(insights),
            reminders_created=reminders_created,
            notifications_created=notifications_created,
            insights=insights,
        )
