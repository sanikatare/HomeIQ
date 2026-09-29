"""
HomeIQ — Domain Service Layer for All 18 Household Modules.
Encapsulates business rules, stock threshold evaluation, TCO calculation,
and audit event creation outside of HTTP route handlers.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Sequence

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthenticatedContext
from app.core.errors import ConflictError, DomainValidationError, ResourceNotFoundError
from app.core.logging import get_logger
from app.db.enums import (
    EventSeverity,
    NotificationStatus,
    ReminderPriority,
    ReminderStatus,
    StockStatus,
)
from app.db.models import (
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
from app.repositories.household_repositories import RepositoryRegistry
from app.schemas.api_schemas import (
    ApplianceCreateRequest,
    AssetCreateRequest,
    BillCreateRequest,
    ClothingItemCreateRequest,
    DocumentCreateRequest,
    ExpenseCreateRequest,
    GroceryItemCreateRequest,
    HouseholdCreateRequest,
    HouseholdMemberCreateRequest,
    InsuranceCreateRequest,
    InventoryItemCreateRequest,
    MaintenanceCreateRequest,
    NotificationCreateRequest,
    ParentHealthRecordCreateRequest,
    ReminderCreateRequest,
    SubscriptionCreateRequest,
    UserCreateRequest,
    VehicleCreateRequest,
    WarrantyCreateRequest,
)

logger = get_logger("household_services")


class HouseholdPlatformService:
    """
    Unified service facade orchestrating deterministic domain logic across all 18 modules.
    Route handlers delegate directly to this service layer.
    """

    def __init__(self, session: AsyncSession, ctx: AuthenticatedContext) -> None:
        self.session = session
        self.ctx = ctx
        self.repos = RepositoryRegistry(session)

    async def _record_audit_event(
        self,
        *,
        event_type: str,
        domain: str,
        summary: str,
        asset_id: uuid.UUID | None = None,
        severity: EventSeverity = EventSeverity.INFO,
        payload: dict[str, Any] | None = None,
    ) -> Event:
        event = Event(
            household_id=self.ctx.household_id,
            actor_user_id=self.ctx.user_id,
            asset_id=asset_id,
            event_type=event_type,
            domain=domain,
            severity=severity,
            summary=summary,
            payload_json=payload or {},
            created_by_id=self.ctx.user_id,
        )
        return await self.repos.events.create(event)

    # -------------------------------------------------------------------------
    # 1. Users & Auth Context
    # -------------------------------------------------------------------------
    async def register_user(self, payload: UserCreateRequest) -> User:
        existing = await self.repos.users.get_by_email(payload.email)
        if existing:
            raise ConflictError(f"User with email '{payload.email}' already exists.")
        user = User(
            email=payload.email.lower().strip(),
            full_name=payload.full_name,
            password_hash=f"pbkdf2_sha256${payload.password[:4]}_hashed",
            phone_number=payload.phone_number,
            preferred_locale=payload.preferred_locale,
            timezone=payload.timezone,
            is_active=True,
        )
        created = await self.repos.users.create(user)
        logger.info("user.registered", user_id=str(created.id), email=created.email)
        return created

    # -------------------------------------------------------------------------
    # 2. Households
    # -------------------------------------------------------------------------
    async def list_user_households(self) -> Sequence[Household]:
        return await self.repos.households.list_for_user(self.ctx.user_id)

    async def create_household(self, payload: HouseholdCreateRequest) -> Household:
        existing = await self.repos.households.get_by_slug(payload.slug)
        if existing:
            raise ConflictError(f"Household slug '{payload.slug}' is already in use.")
        household = Household(
            **payload.model_dump(),
            created_by_id=self.ctx.user_id,
            updated_by_id=self.ctx.user_id,
        )
        await self.repos.households.create(household)
        return household

    # -------------------------------------------------------------------------
    # 3. Household Members
    # -------------------------------------------------------------------------
    async def list_members(self, offset: int = 0, limit: int = 50) -> tuple[Sequence[HouseholdMember], int]:
        return await self.repos.members.list_for_household(
            self.ctx.household_id, offset=offset, limit=limit
        )

    async def add_member(self, payload: HouseholdMemberCreateRequest) -> HouseholdMember:
        existing = await self.repos.members.get_membership(self.ctx.household_id, payload.user_id)
        if existing:
            raise ConflictError("User is already a member of this household.")
        member = HouseholdMember(
            household_id=self.ctx.household_id,
            created_by_id=self.ctx.user_id,
            **payload.model_dump(),
        )
        return await self.repos.members.create(member)

    # -------------------------------------------------------------------------
    # 4. Assets
    # -------------------------------------------------------------------------
    async def list_assets(
        self,
        *,
        offset: int = 0,
        limit: int = 50,
        category: str | None = None,
    ) -> tuple[Sequence[Asset], int]:
        filters = {"category": category} if category else None
        return await self.repos.assets.list_for_household(
            self.ctx.household_id, offset=offset, limit=limit, filters=filters
        )

    async def get_asset(self, asset_id: uuid.UUID) -> Asset:
        asset = await self.repos.assets.get_by_id(self.ctx.household_id, asset_id)
        if not asset:
            raise ResourceNotFoundError("Asset", asset_id)
        return asset

    async def create_asset(self, payload: AssetCreateRequest) -> Asset:
        asset = Asset(
            household_id=self.ctx.household_id,
            created_by_id=self.ctx.user_id,
            **payload.model_dump(),
        )
        created = await self.repos.assets.create(asset)
        await self._record_audit_event(
            event_type="asset.created",
            domain="assets",
            summary=f"Registered asset '{created.name}' ({created.asset_tag})",
            asset_id=created.id,
        )
        return created

    async def get_asset_tco(self, asset_id: uuid.UUID) -> dict[str, Any]:
        asset = await self.get_asset(asset_id)
        tco = await self.repos.assets.compute_asset_tco_minor(self.ctx.household_id, asset.id)
        return {
            "asset_id": asset.id,
            "asset_tag": asset.asset_tag,
            "name": asset.name,
            **tco,
        }

    # -------------------------------------------------------------------------
    # 5. Appliances
    # -------------------------------------------------------------------------
    async def list_appliances(self, offset: int = 0, limit: int = 50) -> tuple[Sequence[Appliance], int]:
        return await self.repos.appliances.list_for_household(
            self.ctx.household_id, offset=offset, limit=limit
        )

    async def create_appliance(self, payload: ApplianceCreateRequest) -> Appliance:
        await self.get_asset(payload.asset_id)
        appliance = Appliance(
            household_id=self.ctx.household_id,
            created_by_id=self.ctx.user_id,
            **payload.model_dump(),
        )
        return await self.repos.appliances.create(appliance)

    # -------------------------------------------------------------------------
    # 6. Vehicles
    # -------------------------------------------------------------------------
    async def list_vehicles(self, offset: int = 0, limit: int = 50) -> tuple[Sequence[Vehicle], int]:
        return await self.repos.vehicles.list_for_household(
            self.ctx.household_id, offset=offset, limit=limit
        )

    async def create_vehicle(self, payload: VehicleCreateRequest) -> Vehicle:
        await self.get_asset(payload.asset_id)
        if payload.last_service_odometer_km > payload.odometer_km:
            raise DomainValidationError(
                "last_service_odometer_km cannot exceed current odometer_km."
            )
        vehicle = Vehicle(
            household_id=self.ctx.household_id,
            created_by_id=self.ctx.user_id,
            **payload.model_dump(),
        )
        return await self.repos.vehicles.create(vehicle)

    # -------------------------------------------------------------------------
    # 7. Inventory (with Deterministic Stock Status Computation)
    # -------------------------------------------------------------------------
    @staticmethod
    def compute_stock_status(quantity: Decimal, threshold: Decimal) -> StockStatus:
        if quantity <= Decimal("0"):
            return StockStatus.OUT_OF_STOCK
        if quantity <= threshold:
            return StockStatus.LOW_STOCK
        return StockStatus.IN_STOCK

    async def list_inventory(self, offset: int = 0, limit: int = 50) -> tuple[Sequence[InventoryItem], int]:
        return await self.repos.inventory.list_for_household(
            self.ctx.household_id, offset=offset, limit=limit
        )

    async def create_inventory_item(self, payload: InventoryItemCreateRequest) -> InventoryItem:
        computed_status = self.compute_stock_status(
            payload.quantity_on_hand, payload.reorder_threshold
        )
        item = InventoryItem(
            household_id=self.ctx.household_id,
            created_by_id=self.ctx.user_id,
            stock_status=computed_status,
            **payload.model_dump(),
        )
        return await self.repos.inventory.create(item)

    # -------------------------------------------------------------------------
    # 8. Groceries
    # -------------------------------------------------------------------------
    async def list_groceries(self, offset: int = 0, limit: int = 50) -> tuple[Sequence[GroceryItem], int]:
        return await self.repos.groceries.list_for_household(
            self.ctx.household_id, offset=offset, limit=limit
        )

    async def create_grocery_item(self, payload: GroceryItemCreateRequest) -> GroceryItem:
        item = GroceryItem(
            household_id=self.ctx.household_id,
            created_by_id=self.ctx.user_id,
            **payload.model_dump(),
        )
        return await self.repos.groceries.create(item)

    # -------------------------------------------------------------------------
    # 9. Clothing
    # -------------------------------------------------------------------------
    async def list_clothing(self, offset: int = 0, limit: int = 50) -> tuple[Sequence[ClothingItem], int]:
        return await self.repos.clothing.list_for_household(
            self.ctx.household_id, offset=offset, limit=limit
        )

    async def create_clothing_item(self, payload: ClothingItemCreateRequest) -> ClothingItem:
        item = ClothingItem(
            household_id=self.ctx.household_id,
            created_by_id=self.ctx.user_id,
            **payload.model_dump(),
        )
        return await self.repos.clothing.create(item)

    # -------------------------------------------------------------------------
    # 10. Bills
    # -------------------------------------------------------------------------
    async def list_bills(self, offset: int = 0, limit: int = 50) -> tuple[Sequence[Bill], int]:
        return await self.repos.bills.list_for_household(
            self.ctx.household_id, offset=offset, limit=limit
        )

    async def create_bill(self, payload: BillCreateRequest) -> Bill:
        bill = Bill(
            household_id=self.ctx.household_id,
            created_by_id=self.ctx.user_id,
            **payload.model_dump(),
        )
        return await self.repos.bills.create(bill)

    # -------------------------------------------------------------------------
    # 11. Expenses
    # -------------------------------------------------------------------------
    async def list_expenses(self, offset: int = 0, limit: int = 50) -> tuple[Sequence[Expense], int]:
        return await self.repos.expenses.list_for_household(
            self.ctx.household_id, offset=offset, limit=limit
        )

    async def create_expense(self, payload: ExpenseCreateRequest) -> Expense:
        if payload.asset_id:
            await self.get_asset(payload.asset_id)
        expense = Expense(
            household_id=self.ctx.household_id,
            paid_by_user_id=self.ctx.user_id,
            created_by_id=self.ctx.user_id,
            **payload.model_dump(),
        )
        return await self.repos.expenses.create(expense)

    # -------------------------------------------------------------------------
    # 12. Subscriptions
    # -------------------------------------------------------------------------
    async def list_subscriptions(
        self, offset: int = 0, limit: int = 50
    ) -> tuple[Sequence[Subscription], int]:
        return await self.repos.subscriptions.list_for_household(
            self.ctx.household_id, offset=offset, limit=limit
        )

    async def create_subscription(self, payload: SubscriptionCreateRequest) -> Subscription:
        sub = Subscription(
            household_id=self.ctx.household_id,
            created_by_id=self.ctx.user_id,
            **payload.model_dump(),
        )
        return await self.repos.subscriptions.create(sub)

    # -------------------------------------------------------------------------
    # 13. Maintenance
    # -------------------------------------------------------------------------
    async def list_maintenance(
        self, offset: int = 0, limit: int = 50
    ) -> tuple[Sequence[MaintenanceRecord], int]:
        return await self.repos.maintenance.list_for_household(
            self.ctx.household_id, offset=offset, limit=limit
        )

    async def create_maintenance_record(
        self, payload: MaintenanceCreateRequest
    ) -> MaintenanceRecord:
        await self.get_asset(payload.asset_id)
        record = MaintenanceRecord(
            household_id=self.ctx.household_id,
            created_by_id=self.ctx.user_id,
            **payload.model_dump(),
        )
        return await self.repos.maintenance.create(record)

    # -------------------------------------------------------------------------
    # 14. Documents
    # -------------------------------------------------------------------------
    async def list_documents(self, offset: int = 0, limit: int = 50) -> tuple[Sequence[Document], int]:
        return await self.repos.documents.list_for_household(
            self.ctx.household_id, offset=offset, limit=limit
        )

    async def create_document(self, payload: DocumentCreateRequest) -> Document:
        if payload.asset_id:
            await self.get_asset(payload.asset_id)
        existing = await self.repos.documents.get_by_sha256(
            self.ctx.household_id, payload.sha256_checksum
        )
        if existing:
            raise ConflictError(
                f"Document with SHA-256 '{payload.sha256_checksum}' already exists in vault."
            )
        doc = Document(
            household_id=self.ctx.household_id,
            created_by_id=self.ctx.user_id,
            **payload.model_dump(),
        )
        return await self.repos.documents.create(doc)

    # -------------------------------------------------------------------------
    # 15. Warranties
    # -------------------------------------------------------------------------
    async def list_warranties(self, offset: int = 0, limit: int = 50) -> tuple[Sequence[Warranty], int]:
        return await self.repos.warranties.list_for_household(
            self.ctx.household_id, offset=offset, limit=limit
        )

    async def create_warranty(self, payload: WarrantyCreateRequest) -> Warranty:
        await self.get_asset(payload.asset_id)
        warranty = Warranty(
            household_id=self.ctx.household_id,
            created_by_id=self.ctx.user_id,
            **payload.model_dump(),
        )
        return await self.repos.warranties.create(warranty)

    # -------------------------------------------------------------------------
    # 16. Insurance Policies
    # -------------------------------------------------------------------------
    async def list_insurance_policies(
        self, offset: int = 0, limit: int = 50
    ) -> tuple[Sequence[InsurancePolicy], int]:
        return await self.repos.insurance.list_for_household(
            self.ctx.household_id, offset=offset, limit=limit
        )

    async def create_insurance_policy(self, payload: InsuranceCreateRequest) -> InsurancePolicy:
        if payload.asset_id:
            await self.get_asset(payload.asset_id)
        policy = InsurancePolicy(
            household_id=self.ctx.household_id,
            created_by_id=self.ctx.user_id,
            **payload.model_dump(),
        )
        return await self.repos.insurance.create(policy)

    # -------------------------------------------------------------------------
    # 17. Reminders
    # -------------------------------------------------------------------------
    async def list_reminders(self, offset: int = 0, limit: int = 50) -> tuple[Sequence[Reminder], int]:
        return await self.repos.reminders.list_for_household(
            self.ctx.household_id, offset=offset, limit=limit
        )

    async def create_reminder(self, payload: ReminderCreateRequest) -> Reminder:
        reminder = Reminder(
            household_id=self.ctx.household_id,
            created_by_id=self.ctx.user_id,
            **payload.model_dump(),
        )
        return await self.repos.reminders.create(reminder)

    async def complete_reminder(self, reminder_id: uuid.UUID) -> Reminder:
        reminder = await self.repos.reminders.get_by_id(self.ctx.household_id, reminder_id)
        if not reminder:
            raise ResourceNotFoundError("Reminder", reminder_id)
        return await self.repos.reminders.update_fields(
            reminder,
            {
                "status": ReminderStatus.COMPLETED,
                "completed_at": datetime.now(timezone.utc),
            },
            updated_by_id=self.ctx.user_id,
        )

    # -------------------------------------------------------------------------
    # 18. Notifications
    # -------------------------------------------------------------------------
    async def list_notifications(
        self, offset: int = 0, limit: int = 50
    ) -> tuple[Sequence[Notification], int]:
        return await self.repos.notifications.list_for_household(
            self.ctx.household_id, offset=offset, limit=limit
        )

    async def create_notification(self, payload: NotificationCreateRequest) -> Notification:
        notif = Notification(
            household_id=self.ctx.household_id,
            created_by_id=self.ctx.user_id,
            **payload.model_dump(),
        )
        return await self.repos.notifications.create(notif)

    async def mark_notification_read(self, notification_id: uuid.UUID) -> Notification:
        notif = await self.repos.notifications.get_by_id(self.ctx.household_id, notification_id)
        if not notif:
            raise ResourceNotFoundError("Notification", notification_id)
        return await self.repos.notifications.update_fields(
            notif,
            {
                "status": NotificationStatus.READ,
                "read_at": datetime.now(timezone.utc),
            },
            updated_by_id=self.ctx.user_id,
        )

    # -------------------------------------------------------------------------
    # 19. Parents' Health Monitoring Records
    # -------------------------------------------------------------------------
    async def list_parent_health_records(
        self, offset: int = 0, limit: int = 50
    ) -> tuple[Sequence[ParentHealthRecord], int]:
        return await self.repos.parent_health.list_for_household(
            self.ctx.household_id, offset=offset, limit=limit
        )

    async def create_parent_health_record(
        self, payload: ParentHealthRecordCreateRequest
    ) -> ParentHealthRecord:
        record = ParentHealthRecord(
            household_id=self.ctx.household_id,
            created_by_id=self.ctx.user_id,
            **payload.model_dump(),
        )
        created = await self.repos.parent_health.create(record)
        await self._record_audit_event(
            event_type="health.record.logged",
            domain="parents_health",
            summary=f"Recorded parent health entry '{created.title}' for {created.parent_name}",
            payload={
                "record_id": str(created.id),
                "parent_name": created.parent_name,
                "record_category": created.record_category.value,
                "next_due_or_followup_date": (
                    created.next_due_or_followup_date.isoformat()
                    if created.next_due_or_followup_date
                    else None
                ),
            },
        )
        if created.next_due_or_followup_date:
            due_dt = datetime(
                created.next_due_or_followup_date.year,
                created.next_due_or_followup_date.month,
                created.next_due_or_followup_date.day,
                9,
                0,
                tzinfo=timezone.utc,
            )
            reminder = Reminder(
                household_id=self.ctx.household_id,
                assigned_user_id=self.ctx.user_id,
                title=f"{created.parent_name}: {created.title}",
                description=f"Follow-up / checkup scheduled with {created.provider_or_doctor or 'healthcare provider'}.",
                domain="parents_health",
                priority=ReminderPriority.HIGH,
                status=ReminderStatus.PENDING,
                due_at=due_dt,
                created_by_id=self.ctx.user_id,
            )
            await self.repos.reminders.create(reminder)
        return created
