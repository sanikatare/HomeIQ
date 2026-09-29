"""
HomeIQ — Domain-Specific Data Access & Deterministic SQL Aggregation Repositories.
All arithmetic, TCO rollups, budget burn rates, and expiry window checks are
executed deterministically in SQL/Python—never delegated to an LLM.
"""
import uuid
from datetime import date, timedelta
from typing import Any, Sequence

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.enums import (
    BillStatus,
    ExpenseCategory,
    ReminderStatus,
    StockStatus,
    WarrantyStatus,
)
from app.db.models import (
    AgentRun,
    Appliance,
    Asset,
    Bill,
    ClothingItem,
    Document,
    Event,
    Expense,
    GroceryItem,
    Household,
    HouseholdMember,
    InsurancePolicy,
    InventoryItem,
    MaintenanceRecord,
    Notification,
    ParentHealthRecord,
    Reminder,
    Subscription,
    User,
    Vehicle,
    Warranty,
)
from app.repositories.base import BaseRepository, TenantRepository


class UserRepository(BaseRepository[User]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, User)

    async def get_by_email(self, email: str) -> User | None:
        stmt = select(User).where(func.lower(User.email) == email.lower().strip())
        return (await self.session.execute(stmt)).scalar_one_or_none()


class HouseholdRepository(BaseRepository[Household]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Household)

    async def get_by_slug(self, slug: str) -> Household | None:
        stmt = select(Household).where(Household.slug == slug)
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def list_for_user(self, user_id: uuid.UUID) -> Sequence[Household]:
        stmt = (
            select(Household)
            .join(HouseholdMember, HouseholdMember.household_id == Household.id)
            .where(HouseholdMember.user_id == user_id)
            .order_by(Household.created_at.desc())
        )
        return (await self.session.execute(stmt)).scalars().all()


class HouseholdMemberRepository(TenantRepository[HouseholdMember]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, HouseholdMember)

    async def get_membership(
        self,
        household_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> HouseholdMember | None:
        stmt = select(HouseholdMember).where(
            HouseholdMember.household_id == household_id,
            HouseholdMember.user_id == user_id,
        )
        return (await self.session.execute(stmt)).scalar_one_or_none()


class AssetRepository(TenantRepository[Asset]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Asset)

    async def get_with_full_dossier(
        self,
        household_id: uuid.UUID,
        asset_id: uuid.UUID,
    ) -> Asset | None:
        """
        Loads an Asset together with its 1-to-1 specialization (Appliance or Vehicle)
        and all associated Documents, Warranties, InsurancePolicies, MaintenanceRecords,
        and Expenses.
        """
        stmt = (
            select(Asset)
            .where(Asset.household_id == household_id, Asset.id == asset_id)
            .options(
                selectinload(Asset.appliance_detail),
                selectinload(Asset.vehicle_detail),
                selectinload(Asset.documents),
                selectinload(Asset.warranties),
                selectinload(Asset.insurance_policies),
                selectinload(Asset.maintenance_records),
                selectinload(Asset.expenses),
            )
        )
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def compute_asset_tco_minor(
        self,
        household_id: uuid.UUID,
        asset_id: uuid.UUID,
    ) -> dict[str, int]:
        """
        Deterministic SQL computation of an Asset's Total Cost of Ownership (TCO)
        in minor currency units:
        purchase_price_minor + sum(maintenance labor + parts) + sum(standalone asset expenses).
        """
        asset = await self.get_by_id(household_id, asset_id)
        if not asset:
            return {
                "purchase_price_minor": 0,
                "maintenance_cost_minor": 0,
                "direct_expenses_minor": 0,
                "total_tco_minor": 0,
            }

        maint_stmt = select(
            func.coalesce(
                func.sum(MaintenanceRecord.labor_cost_minor + MaintenanceRecord.parts_cost_minor),
                0,
            )
        ).where(
            MaintenanceRecord.household_id == household_id,
            MaintenanceRecord.asset_id == asset_id,
        )
        maint_total = int((await self.session.execute(maint_stmt)).scalar_one())

        # Direct expenses associated with the asset that are not already duplicating a maintenance record
        exp_stmt = select(func.coalesce(func.sum(Expense.amount_minor), 0)).where(
            Expense.household_id == household_id,
            Expense.asset_id == asset_id,
            Expense.maintenance_record_id.is_(None),
        )
        exp_total = int((await self.session.execute(exp_stmt)).scalar_one())

        purchase_minor = int(asset.purchase_price_minor)
        return {
            "purchase_price_minor": purchase_minor,
            "maintenance_cost_minor": maint_total,
            "direct_expenses_minor": exp_total,
            "total_tco_minor": purchase_minor + maint_total + exp_total,
        }


class InventoryRepository(TenantRepository[InventoryItem]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, InventoryItem)

    async def list_low_or_expiring(
        self,
        household_id: uuid.UUID,
        *,
        within_days: int = 7,
    ) -> Sequence[InventoryItem]:
        cutoff = date.today() + timedelta(days=within_days)
        stmt = (
            select(InventoryItem)
            .where(
                InventoryItem.household_id == household_id,
                (InventoryItem.quantity_on_hand <= InventoryItem.reorder_threshold)
                | (InventoryItem.stock_status == StockStatus.LOW_STOCK)
                | (InventoryItem.expiry_date <= cutoff),
            )
            .order_by(InventoryItem.expiry_date.asc())
        )
        return (await self.session.execute(stmt)).scalars().all()


class FinanceRepository(TenantRepository[Expense]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Expense)

    async def summarize_monthly_spend(
        self,
        household_id: uuid.UUID,
        *,
        start_date: date,
        end_date: date,
    ) -> dict[str, Any]:
        """Deterministic SQL rollup of household expenses by category."""
        stmt = (
            select(
                Expense.category,
                func.coalesce(func.sum(Expense.amount_minor), 0).label("total_minor"),
                func.count(Expense.id).label("tx_count"),
            )
            .where(
                Expense.household_id == household_id,
                Expense.incurred_on >= start_date,
                Expense.incurred_on <= end_date,
            )
            .group_by(Expense.category)
        )
        rows = (await self.session.execute(stmt)).all()
        by_category: dict[str, dict[str, int]] = {}
        grand_total = 0
        for cat, total_minor, tx_count in rows:
            cat_key = cat.value if isinstance(cat, ExpenseCategory) else str(cat)
            amount_int = int(total_minor)
            by_category[cat_key] = {"total_minor": amount_int, "transaction_count": int(tx_count)}
            grand_total += amount_int

        return {
            "period_start": start_date.isoformat(),
            "period_end": end_date.isoformat(),
            "grand_total_minor": grand_total,
            "by_category": by_category,
        }


class DocumentRepository(TenantRepository[Document]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, Document)

    async def get_by_sha256(
        self,
        household_id: uuid.UUID,
        sha256_checksum: str,
    ) -> Document | None:
        stmt = select(Document).where(
            Document.household_id == household_id,
            Document.sha256_checksum == sha256_checksum,
        )
        return (await self.session.execute(stmt)).scalar_one_or_none()


# Convenience factory for all 18 domain repositories
class RepositoryRegistry:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.users = UserRepository(session)
        self.households = HouseholdRepository(session)
        self.members = HouseholdMemberRepository(session)
        self.assets = AssetRepository(session)
        self.appliances = TenantRepository(session, Appliance)
        self.vehicles = TenantRepository(session, Vehicle)
        self.inventory = InventoryRepository(session)
        self.groceries = TenantRepository(session, GroceryItem)
        self.clothing = TenantRepository(session, ClothingItem)
        self.bills = TenantRepository(session, Bill)
        self.expenses = FinanceRepository(session)
        self.subscriptions = TenantRepository(session, Subscription)
        self.maintenance = TenantRepository(session, MaintenanceRecord)
        self.documents = DocumentRepository(session)
        self.warranties = TenantRepository(session, Warranty)
        self.insurance = TenantRepository(session, InsurancePolicy)
        self.reminders = TenantRepository(session, Reminder)
        self.events = TenantRepository(session, Event)
        self.agent_runs = TenantRepository(session, AgentRun)
        self.notifications = TenantRepository(session, Notification)
        self.parent_health = TenantRepository(session, ParentHealthRecord)
