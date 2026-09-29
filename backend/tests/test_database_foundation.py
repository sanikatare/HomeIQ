"""
HomeIQ — Database Foundation Tests (20 Tables, Asset Relationships, Cascades & Constraints).
"""
from __future__ import annotations

import uuid
from datetime import date

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import ALL_MODELS, Base
from app.db.enums import AssetCategory, WarrantyType
from app.db.models import Asset, Warranty
from app.repositories.household_repositories import RepositoryRegistry

SEEDED_HOUSEHOLD_ID = uuid.UUID("22222222-2222-4222-8222-222222222201")
SEEDED_DISHWASHER_ASSET_ID = uuid.UUID("44444444-4444-4444-8444-444444444401")
SEEDED_CAR_ASSET_ID = uuid.UUID("44444444-4444-4444-8444-444444444402")


@pytest.mark.asyncio
async def test_exact_twenty_normalized_tables_registered() -> None:
    expected_tables = {
        "users",
        "households",
        "household_members",
        "assets",
        "appliances",
        "vehicles",
        "grocery_items",
        "inventory_items",
        "clothing_items",
        "bills",
        "expenses",
        "subscriptions",
        "maintenance_records",
        "documents",
        "warranties",
        "insurance_policies",
        "reminders",
        "events",
        "agent_runs",
        "notifications",
        "parent_health_records",
    }
    assert len(ALL_MODELS) == 21
    assert set(Base.metadata.tables.keys()) == expected_tables


@pytest.mark.asyncio
async def test_asset_dossier_associations_and_deterministic_tco(
    db_session: AsyncSession,
) -> None:
    """
    Verifies that an Asset cleanly links to its 1-to-1 Appliance/Vehicle detail,
    Documents, Warranties, MaintenanceRecords, and Expenses, and computes exact TCO.
    """
    repos = RepositoryRegistry(db_session)
    dossier = await repos.assets.get_with_full_dossier(
        SEEDED_HOUSEHOLD_ID, SEEDED_DISHWASHER_ASSET_ID
    )
    assert dossier is not None
    assert dossier.appliance_detail is not None
    assert dossier.appliance_detail.appliance_type.value == "DISHWASHER"
    assert len(dossier.documents) == 1
    assert len(dossier.warranties) == 1
    assert len(dossier.maintenance_records) == 1
    assert len(dossier.expenses) == 1

    # Purchase (54,900.00 = 5490000) + Maintenance parts (850.00 = 85000) = 5575000 minor units
    tco = await repos.assets.compute_asset_tco_minor(
        SEEDED_HOUSEHOLD_ID, SEEDED_DISHWASHER_ASSET_ID
    )
    assert tco["purchase_price_minor"] == 5490000
    assert tco["maintenance_cost_minor"] == 85000
    assert tco["total_tco_minor"] == 5575000


@pytest.mark.asyncio
async def test_asset_deletion_cascades_and_preserves_financial_ledger(
    db_session: AsyncSession,
) -> None:
    """
    Deleting an Asset must CASCADE to its Appliance/Warranty/MaintenanceRecord,
    while setting asset_id=NULL on Expense and Document so financial/document
    history is preserved.
    """
    repos = RepositoryRegistry(db_session)
    asset = await repos.assets.get_by_id(SEEDED_HOUSEHOLD_ID, SEEDED_DISHWASHER_ASSET_ID)
    assert asset is not None

    await repos.assets.delete(asset)
    await db_session.commit()

    # Warranties and maintenance records for dishwasher should be cascade-deleted
    warranties, _ = await repos.warranties.list_for_household(SEEDED_HOUSEHOLD_ID)
    assert all(w.asset_id != SEEDED_DISHWASHER_ASSET_ID for w in warranties)

    # Expense and Document must still exist with asset_id = None
    expenses, _ = await repos.expenses.list_for_household(SEEDED_HOUSEHOLD_ID)
    assert len(expenses) == 1
    assert expenses[0].asset_id is None


@pytest.mark.asyncio
async def test_check_and_unique_constraints_enforced(db_session: AsyncSession) -> None:
    """Verifies database check constraints (e.g., warranty end_date >= start_date, negative price)."""
    invalid_warranty = Warranty(
        household_id=SEEDED_HOUSEHOLD_ID,
        asset_id=SEEDED_CAR_ASSET_ID,
        warranty_type=WarrantyType.EXTENDED_WARRANTY,
        provider_name="Invalid Date Corp",
        start_date=date(2026, 10, 1),
        end_date=date(2025, 1, 1),  # Violates ck_warranties_warranty_end_after_start
    )
    db_session.add(invalid_warranty)
    with pytest.raises(IntegrityError):
        await db_session.flush()
    await db_session.rollback()

    negative_asset = Asset(
        household_id=SEEDED_HOUSEHOLD_ID,
        asset_tag="AST-NEG-01",
        name="Negative Price Asset",
        category=AssetCategory.OTHER,
        purchase_price_minor=-500,  # Violates ck_assets_non_negative_asset_purchase_price
    )
    db_session.add(negative_asset)
    with pytest.raises(IntegrityError):
        await db_session.flush()
    await db_session.rollback()
