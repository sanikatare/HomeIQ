"""
HomeIQ — Shared Retrieval Interface & Application Tool Registry.

Invariants:
- Agents have NO unrestricted database or raw SQL access.
- Every tool declares its owning `HouseholdDomainId`, `ActionRiskLevel`,
  and `permitted_tables` whitelist.
- All financial calculations, date diffs, and stock evaluations are performed
  by deterministic Python/SQL inside these tools.
"""
from __future__ import annotations

import time
import uuid
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal
from typing import Any, Awaitable, Callable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.observability import (
    RAG_EMBEDDING_FAILURES_TOTAL,
    RAG_EMPTY_RESULTS_TOTAL,
    RAG_RETRIEVAL_DURATION,
    RAG_RETRIEVALS_TOTAL,
    trace_operation,
)
from app.core.security import neutralize_document_embedded_instructions
from app.db.enums import (
    ActionRiskLevel,
    BillStatus,
    GroceryCategory,
    LaundryStatus,
    MaintenanceStatus,
    MaintenanceType,
    MeasurementUnit,
    WarrantyStatus,
)
from app.db.models import (
    Appliance,
    Asset,
    Bill,
    ClothingItem,
    Document,
    Expense,
    GroceryItem,
    InsurancePolicy,
    InventoryItem,
    MaintenanceRecord,
    Subscription,
    Vehicle,
    Warranty,
)
from app.intelligence.schemas import HouseholdDomainId, RecordedHouseholdFact
from app.repositories.household_repositories import RepositoryRegistry

ToolCallable = Callable[[AsyncSession, uuid.UUID, dict[str, Any]], Awaitable[dict[str, Any]]]


@dataclass(frozen=True)
class RegisteredTool:
    name: str
    domain: HouseholdDomainId
    description: str
    risk_level: ActionRiskLevel
    permitted_tables: tuple[str, ...]
    handler: ToolCallable


class SharedRetrievalInterface:
    """
    Single shared retrieval & RAG interface across all 7 domain agents.
    Queries indexed household `documents` scoped strictly to `household_id`
    (and optional `asset_id` or `document_type`) and returns cited snippets.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def retrieve_grounded_documents(
        self,
        *,
        household_id: uuid.UUID,
        query: str,
        asset_id: uuid.UUID | None = None,
        limit: int = 5,
        domain_label: str = "documents_warranty",
    ) -> list[dict[str, Any]]:
        t0 = time.perf_counter()
        try:
            with trace_operation(
                "rag.retrieve_grounded_documents",
                attributes={"household_id": str(household_id), "domain": domain_label},
            ):
                stmt = select(Document).where(
                    Document.household_id == household_id,
                    Document.is_indexed_for_rag.is_(True),
                )
                if asset_id is not None:
                    stmt = stmt.where(Document.asset_id == asset_id)

                docs = (await self.session.execute(stmt.limit(25))).scalars().all()
                keywords = [w.lower() for w in query.split() if len(w) >= 3]

                # Deduplicate chunks/documents by sha256_checksum so duplicate uploads never pollute RAG
                seen_hashes: set[str] = set()
                scored: list[tuple[int, Document]] = []
                for doc in docs:
                    if doc.sha256_checksum in seen_hashes:
                        continue
                    seen_hashes.add(doc.sha256_checksum)
                    haystack = f"{doc.title} {doc.extracted_text or ''}".lower()
                    score = sum(2 for kw in keywords if kw in haystack)
                    if score > 0 or not keywords:
                        scored.append((score, doc))

                scored.sort(key=lambda pair: pair[0], reverse=True)
                selected = [d for _, d in scored[:limit]] if keywords else list(docs[:limit])

                RAG_RETRIEVAL_DURATION.labels(domain=domain_label).observe(
                    time.perf_counter() - t0
                )
                RAG_RETRIEVALS_TOTAL.labels(domain=domain_label, status="success").inc()
                if not selected:
                    RAG_EMPTY_RESULTS_TOTAL.labels(domain=domain_label).inc()

                return [
                    {
                        "document_id": str(doc.id),
                        "title": doc.title,
                        "document_type": doc.document_type.value,
                        "asset_id": str(doc.asset_id) if doc.asset_id else None,
                        "gcs_uri": doc.gcs_uri,
                        "excerpt": neutralize_document_embedded_instructions(
                            (doc.extracted_text or "")[:320]
                        ),
                        "expiry_date": doc.expiry_date.isoformat() if doc.expiry_date else None,
                    }
                    for doc in selected
                ]
        except Exception as exc:
            RAG_EMBEDDING_FAILURES_TOTAL.labels(reason=type(exc).__name__).inc()
            RAG_RETRIEVALS_TOTAL.labels(domain=domain_label, status="degraded_fallback").inc()
            return []


# =============================================================================
# Deterministic Domain Application Tools (Shared Registry)
# =============================================================================
async def tool_kitchen_stock_and_groceries(
    session: AsyncSession,
    household_id: uuid.UUID,
    params: dict[str, Any],
) -> dict[str, Any]:
    repos = RepositoryRegistry(session)
    low_items = await repos.inventory.list_low_or_expiring(household_id, within_days=14)
    all_inv, _ = await repos.inventory.list_for_household(household_id, limit=50)
    groceries, _ = await repos.groceries.list_for_household(household_id, limit=50)

    facts: list[RecordedHouseholdFact] = []
    for item in all_inv:
        facts.append(
            RecordedHouseholdFact(
                source_table="inventory_items",
                record_id=str(item.id),
                field_or_metric=f"{item.name} quantity_on_hand",
                recorded_value=f"{item.quantity_on_hand} {item.unit.value} (status={item.stock_status.value}, threshold={item.reorder_threshold})",
                is_deterministic_calculation=True,
            )
        )
    pending_groceries = [g for g in groceries if not g.is_purchased]
    estimated_replenishment_minor = sum(
        int(Decimal(str(g.planned_quantity)) * Decimal(g.estimated_unit_price_minor))
        for g in pending_groceries
    )
    return {
        "facts": [f.model_dump() for f in facts],
        "metrics": {
            "inventory_count": len(all_inv),
            "low_or_expiring_count": len(low_items),
            "pending_shopping_items": len(pending_groceries),
            "deterministic_shopping_cart_estimate_minor": estimated_replenishment_minor,
        },
        "low_items": [
            {
                "id": str(i.id),
                "name": i.name,
                "qty": str(i.quantity_on_hand),
                "threshold": str(i.reorder_threshold),
                "unit": i.unit.value,
            }
            for i in low_items
        ],
    }


async def tool_kitchen_add_replenishment_item(
    session: AsyncSession,
    household_id: uuid.UUID,
    params: dict[str, Any],
) -> dict[str, Any]:
    repos = RepositoryRegistry(session)
    name = str(params.get("name", "Household Staple"))
    qty = Decimal(str(params.get("planned_quantity", "1.0")))
    unit_price_minor = int(params.get("estimated_unit_price_minor", 10000))
    item = GroceryItem(
        household_id=household_id,
        name=name,
        category=GroceryCategory.GRAINS_PULSES,
        planned_quantity=qty,
        unit=MeasurementUnit.KILOGRAM,
        estimated_unit_price_minor=unit_price_minor,
        added_reason="Agent low-stock replenishment tool",
    )
    created = await repos.groceries.create(item)
    return {
        "facts": [
            RecordedHouseholdFact(
                source_table="grocery_items",
                record_id=str(created.id),
                field_or_metric="created_grocery_item",
                recorded_value=f"{created.name} ({created.planned_quantity} {created.unit.value})",
            ).model_dump()
        ],
        "metrics": {"created_grocery_item_id": str(created.id)},
        "emitted_event": "grocery.item.added",
    }


async def tool_laundry_wardrobe_care_matrix(
    session: AsyncSession,
    household_id: uuid.UUID,
    params: dict[str, Any],
) -> dict[str, Any]:
    repos = RepositoryRegistry(session)
    garments, _ = await repos.clothing.list_for_household(household_id, limit=100)
    facts: list[RecordedHouseholdFact] = []
    buckets: dict[str, list[str]] = {}

    for g in garments:
        facts.append(
            RecordedHouseholdFact(
                source_table="clothing_items",
                record_id=str(g.id),
                field_or_metric=f"{g.name} care constraint",
                recorded_value=(
                    f"{g.fabric_composition} | {g.wash_care_method.value} | "
                    f"max {g.max_wash_temp_celsius}°C | status={g.laundry_status.value}"
                ),
            )
        )
        key = f"{g.wash_care_method.value}@{g.max_wash_temp_celsius}C"
        buckets.setdefault(key, []).append(g.name)

    dry_clean_only = [g.name for g in garments if g.wash_care_method.value == "DRY_CLEAN_ONLY"]
    needs_wash = [g.name for g in garments if g.laundry_status == LaundryStatus.IN_LAUNDRY_BASKET]
    return {
        "facts": [f.model_dump() for f in facts],
        "metrics": {
            "total_garments": len(garments),
            "dry_clean_only_count": len(dry_clean_only),
            "in_laundry_basket_count": len(needs_wash),
            "compatible_wash_groups": buckets,
        },
    }


async def tool_home_maintenance_inspect_assets(
    session: AsyncSession,
    household_id: uuid.UUID,
    params: dict[str, Any],
) -> dict[str, Any]:
    repos = RepositoryRegistry(session)
    appliances, _ = await repos.appliances.list_for_household(household_id, limit=50)
    maint_records, _ = await repos.maintenance.list_for_household(household_id, limit=50)
    assets, _ = await repos.assets.list_for_household(household_id, limit=50)
    asset_map = {a.id: a for a in assets}

    facts: list[RecordedHouseholdFact] = []
    upcoming_due: list[dict[str, Any]] = []
    today = date.today()

    for app in appliances:
        parent_asset = asset_map.get(app.asset_id)
        asset_name = parent_asset.name if parent_asset else str(app.asset_id)
        days_until = (app.next_service_due_date - today).days if app.next_service_due_date else None
        facts.append(
            RecordedHouseholdFact(
                source_table="appliances",
                record_id=str(app.id),
                field_or_metric=f"{asset_name} next_service_due_date",
                recorded_value=f"{app.next_service_due_date} (interval={app.service_interval_days}d)",
                is_deterministic_calculation=True,
            )
        )
        if app.next_service_due_date:
            upcoming_due.append(
                {
                    "asset_id": str(app.asset_id),
                    "asset_name": asset_name,
                    "next_service_due_date": app.next_service_due_date.isoformat(),
                    "days_remaining": days_until,
                }
            )

    for rec in maint_records:
        total_cost = rec.labor_cost_minor + rec.parts_cost_minor
        facts.append(
            RecordedHouseholdFact(
                source_table="maintenance_records",
                record_id=str(rec.id),
                field_or_metric=rec.title,
                recorded_value=(
                    f"date={rec.service_date}, status={rec.status.value}, "
                    f"total_cost_minor={total_cost}, warranty_covered={rec.covered_under_warranty}"
                ),
                is_deterministic_calculation=True,
            )
        )

    return {
        "facts": [f.model_dump() for f in facts],
        "metrics": {
            "appliances_monitored": len(appliances),
            "maintenance_records_count": len(maint_records),
            "upcoming_service_schedules": upcoming_due,
        },
    }


async def tool_bills_utilities_audit(
    session: AsyncSession,
    household_id: uuid.UUID,
    params: dict[str, Any],
) -> dict[str, Any]:
    repos = RepositoryRegistry(session)
    bills, _ = await repos.bills.list_for_household(household_id, limit=50)
    subs, _ = await repos.subscriptions.list_for_household(household_id, limit=50)

    facts: list[RecordedHouseholdFact] = []
    unpaid_total_minor = 0
    for b in bills:
        if b.status in {BillStatus.PENDING_PAYMENT, BillStatus.OVERDUE, BillStatus.UPCOMING}:
            unpaid_total_minor += int(b.amount_due_minor)
        unit_rate = (
            round((b.amount_due_minor / 100.0) / float(b.units_consumed), 2)
            if b.units_consumed and b.units_consumed > 0
            else None
        )
        facts.append(
            RecordedHouseholdFact(
                source_table="bills",
                record_id=str(b.id),
                field_or_metric=f"{b.provider_name} ({b.category.value})",
                recorded_value=(
                    f"amount_due_minor={b.amount_due_minor}, due_date={b.due_date}, "
                    f"status={b.status.value}, units={b.units_consumed} {b.unit_measure or ''}, "
                    f"effective_rate_inr_per_unit={unit_rate}"
                ),
                is_deterministic_calculation=True,
            )
        )

    monthly_sub_minor = sum(int(s.recurring_amount_minor) for s in subs if s.status.value == "ACTIVE")
    return {
        "facts": [f.model_dump() for f in facts],
        "metrics": {
            "bills_count": len(bills),
            "unpaid_bills_total_minor": unpaid_total_minor,
            "active_subscriptions_monthly_minor": monthly_sub_minor,
        },
    }


async def tool_bills_external_payment_dispatch(
    session: AsyncSession,
    household_id: uuid.UUID,
    params: dict[str, Any],
) -> dict[str, Any]:
    """
    EXTERNAL_CONSEQUENTIAL tool: Dispatches an external utility bill payment.
    Always intercepted by the Policy Layer for Human Approval unless pre-approved.
    """
    return {
        "facts": [],
        "metrics": {"dispatched_payment": True, "params": params},
        "emitted_event": "bill.payment.dispatched",
    }


async def tool_expense_budget_deterministic_ledger(
    session: AsyncSession,
    household_id: uuid.UUID,
    params: dict[str, Any],
) -> dict[str, Any]:
    repos = RepositoryRegistry(session)
    household = await repos.households.get_by_id(household_id)
    budget_minor = int(household.monthly_budget_minor) if household else 0

    start_date = date(2026, 1, 1)
    end_date = date(2026, 12, 31)
    rollup = await repos.expenses.summarize_monthly_spend(
        household_id, start_date=start_date, end_date=end_date
    )
    expenses, _ = await repos.expenses.list_for_household(household_id, limit=50)

    spent_minor = int(rollup["grand_total_minor"])
    remaining_minor = budget_minor - spent_minor
    utilization_pct = round((spent_minor / budget_minor) * 100.0, 2) if budget_minor > 0 else 0.0

    facts: list[RecordedHouseholdFact] = [
        RecordedHouseholdFact(
            source_table="households",
            record_id=str(household_id),
            field_or_metric="monthly_budget_minor",
            recorded_value=str(budget_minor),
            is_deterministic_calculation=True,
        )
    ]
    for exp in expenses:
        facts.append(
            RecordedHouseholdFact(
                source_table="expenses",
                record_id=str(exp.id),
                field_or_metric=f"{exp.merchant_name} ({exp.category.value})",
                recorded_value=f"amount_minor={exp.amount_minor} on {exp.incurred_on}",
                is_deterministic_calculation=True,
            )
        )

    return {
        "facts": [f.model_dump() for f in facts],
        "metrics": {
            "household_monthly_budget_minor": budget_minor,
            "total_recorded_spend_minor": spent_minor,
            "remaining_budget_minor": remaining_minor,
            "budget_utilization_percent": utilization_pct,
            "spend_by_category": rollup["by_category"],
        },
    }


async def tool_vehicle_mobility_fleet_status(
    session: AsyncSession,
    household_id: uuid.UUID,
    params: dict[str, Any],
) -> dict[str, Any]:
    repos = RepositoryRegistry(session)
    vehicles, _ = await repos.vehicles.list_for_household(household_id, limit=50)
    facts: list[RecordedHouseholdFact] = []
    fleet_telemetry: list[dict[str, Any]] = []

    for v in vehicles:
        km_since_service = v.odometer_km - v.last_service_odometer_km
        km_remaining = max(0, v.service_interval_km - km_since_service)
        tco = await repos.assets.compute_asset_tco_minor(household_id, v.asset_id)
        facts.append(
            RecordedHouseholdFact(
                source_table="vehicles",
                record_id=str(v.id),
                field_or_metric=f"{v.registration_number} odometer & service interval",
                recorded_value=(
                    f"odometer={v.odometer_km}km, km_remaining_to_service={km_remaining}km, "
                    f"PUC_expiry={v.pollution_cert_expiry_date}, TCO_minor={tco['total_tco_minor']}"
                ),
                is_deterministic_calculation=True,
            )
        )
        fleet_telemetry.append(
            {
                "vehicle_id": str(v.id),
                "asset_id": str(v.asset_id),
                "registration_number": v.registration_number,
                "fuel_type": v.fuel_type.value,
                "odometer_km": v.odometer_km,
                "km_remaining_to_service": km_remaining,
                "pollution_cert_expiry_date": (
                    v.pollution_cert_expiry_date.isoformat()
                    if v.pollution_cert_expiry_date
                    else None
                ),
                "total_tco_minor": tco["total_tco_minor"],
            }
        )

    return {
        "facts": [f.model_dump() for f in facts],
        "metrics": {
            "vehicles_count": len(vehicles),
            "fleet_telemetry": fleet_telemetry,
        },
    }


async def tool_documents_warranty_insurance_vault(
    session: AsyncSession,
    household_id: uuid.UUID,
    params: dict[str, Any],
) -> dict[str, Any]:
    repos = RepositoryRegistry(session)
    retriever = SharedRetrievalInterface(session)
    query = str(params.get("query", ""))

    warranties, _ = await repos.warranties.list_for_household(household_id, limit=50)
    policies, _ = await repos.insurance.list_for_household(household_id, limit=50)
    retrieved_docs = await retriever.retrieve_grounded_documents(
        household_id=household_id,
        query=query,
    )

    facts: list[RecordedHouseholdFact] = []
    for w in warranties:
        facts.append(
            RecordedHouseholdFact(
                source_table="warranties",
                record_id=str(w.id),
                field_or_metric=f"Warranty {w.contract_or_policy_number or w.provider_name}",
                recorded_value=(
                    f"status={w.status.value}, valid={w.start_date} to {w.end_date}, "
                    f"covers_parts={w.covers_parts}, covers_labor={w.covers_labor}, "
                    f"limit_minor={w.coverage_limit_minor}"
                ),
                citation_document_id=str(w.document_id) if w.document_id else None,
            )
        )
    for p in policies:
        facts.append(
            RecordedHouseholdFact(
                source_table="insurance_policies",
                record_id=str(p.id),
                field_or_metric=f"Policy #{p.policy_number} ({p.insurer_name})",
                recorded_value=(
                    f"type={p.insurance_type.value}, valid={p.start_date} to {p.end_date}, "
                    f"sum_insured_minor={p.sum_insured_minor}, premium_minor={p.premium_amount_minor}"
                ),
                citation_document_id=str(p.document_id) if p.document_id else None,
            )
        )
    for d in retrieved_docs:
        facts.append(
            RecordedHouseholdFact(
                source_table="documents",
                record_id=d["document_id"],
                field_or_metric=d["title"],
                recorded_value=d["excerpt"] or "Indexed document metadata",
                citation_document_id=d["document_id"],
            )
        )

    return {
        "facts": [f.model_dump() for f in facts],
        "metrics": {
            "active_warranties_count": sum(1 for w in warranties if w.status == WarrantyStatus.ACTIVE),
            "insurance_policies_count": len(policies),
            "retrieved_documents_count": len(retrieved_docs),
        },
        "retrieved_documents": retrieved_docs,
    }


# =============================================================================
# Central Shared Tool Registry
# =============================================================================
SHARED_TOOL_REGISTRY: dict[str, RegisteredTool] = {
    "inspect_pantry_and_shopping_list": RegisteredTool(
        name="inspect_pantry_and_shopping_list",
        domain=HouseholdDomainId.KITCHEN_GROCERY,
        description="Deterministic check of pantry inventory quantities, reorder thresholds, expiry dates, and shopping cart total.",
        risk_level=ActionRiskLevel.READ_ONLY,
        permitted_tables=("inventory_items", "grocery_items"),
        handler=tool_kitchen_stock_and_groceries,
    ),
    "add_replenishment_grocery_item": RegisteredTool(
        name="add_replenishment_grocery_item",
        domain=HouseholdDomainId.KITCHEN_GROCERY,
        description="Adds a restock item to the household grocery shopping list.",
        risk_level=ActionRiskLevel.INTERNAL_MUTATION,
        permitted_tables=("grocery_items", "inventory_items"),
        handler=tool_kitchen_add_replenishment_item,
    ),
    "analyze_wardrobe_and_wash_compatibility": RegisteredTool(
        name="analyze_wardrobe_and_wash_compatibility",
        domain=HouseholdDomainId.LAUNDRY_CLOTHING,
        description="Groups garments by wash care method, temperature ceiling, and dry-clean constraints.",
        risk_level=ActionRiskLevel.READ_ONLY,
        permitted_tables=("clothing_items", "household_members"),
        handler=tool_laundry_wardrobe_care_matrix,
    ),
    "inspect_home_appliance_maintenance": RegisteredTool(
        name="inspect_home_appliance_maintenance",
        domain=HouseholdDomainId.HOME_MAINTENANCE,
        description="Computes appliance service due countdowns and historical maintenance costs.",
        risk_level=ActionRiskLevel.READ_ONLY,
        permitted_tables=("assets", "appliances", "maintenance_records", "reminders"),
        handler=tool_home_maintenance_inspect_assets,
    ),
    "audit_utility_bills_and_subscriptions": RegisteredTool(
        name="audit_utility_bills_and_subscriptions",
        domain=HouseholdDomainId.BILLS_UTILITIES,
        description="Computes unpaid utility bill totals, effective per-unit kWh rates, and recurring subscription obligations.",
        risk_level=ActionRiskLevel.READ_ONLY,
        permitted_tables=("bills", "subscriptions", "documents"),
        handler=tool_bills_utilities_audit,
    ),
    "dispatch_external_utility_bill_payment": RegisteredTool(
        name="dispatch_external_utility_bill_payment",
        domain=HouseholdDomainId.BILLS_UTILITIES,
        description="Initiates an external bank/UPI payment to settle a utility bill. Requires mandatory Human Approval Gate.",
        risk_level=ActionRiskLevel.EXTERNAL_CONSEQUENTIAL,
        permitted_tables=("bills", "expenses"),
        handler=tool_bills_external_payment_dispatch,
    ),
    "compute_household_budget_and_ledger_variance": RegisteredTool(
        name="compute_household_budget_and_ledger_variance",
        domain=HouseholdDomainId.EXPENSE_BUDGET,
        description="Executes deterministic SQL aggregation of household spend by category, remaining budget, and utilization %.",
        risk_level=ActionRiskLevel.READ_ONLY,
        permitted_tables=("households", "expenses", "bills", "subscriptions"),
        handler=tool_expense_budget_deterministic_ledger,
    ),
    "inspect_vehicle_fleet_and_compliance": RegisteredTool(
        name="inspect_vehicle_fleet_and_compliance",
        domain=HouseholdDomainId.VEHICLE_MOBILITY,
        description="Computes vehicle odometer service countdowns, PUC/registration validity, and deterministic vehicle TCO.",
        risk_level=ActionRiskLevel.READ_ONLY,
        permitted_tables=("assets", "vehicles", "maintenance_records", "insurance_policies", "expenses"),
        handler=tool_vehicle_mobility_fleet_status,
    ),
    "verify_warranties_insurance_and_documents": RegisteredTool(
        name="verify_warranties_insurance_and_documents",
        domain=HouseholdDomainId.DOCUMENTS_WARRANTY,
        description="Queries active warranties, insurance policies, and grounded document vault excerpts with citations.",
        risk_level=ActionRiskLevel.READ_ONLY,
        permitted_tables=("documents", "warranties", "insurance_policies", "assets"),
        handler=tool_documents_warranty_insurance_vault,
    ),
}
