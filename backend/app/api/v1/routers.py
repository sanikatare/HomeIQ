"""
HomeIQ — FastAPI v1 Route Modules for All 18 Household Resources + Document Intelligence.
Route handlers remain thin: they parse HTTP parameters, invoke the service layer,
commit the unit of work, and return typed Pydantic response models.
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import AuthenticatedContext, create_signed_access_token, get_current_context
from app.core.database import get_db_session
from app.db.enums import HouseholdRole
from app.intelligence.document_pipeline import DocumentIntelligencePipeline
from app.schemas.api_schemas import (
    ApplianceCreateRequest,
    ApplianceResponse,
    AssetCreateRequest,
    AssetResponse,
    AssetTCOResponse,
    BillCreateRequest,
    BillResponse,
    ClothingItemCreateRequest,
    ClothingItemResponse,
    DocumentCreateRequest,
    DocumentResponse,
    ExpenseCreateRequest,
    ExpenseResponse,
    GroceryItemCreateRequest,
    GroceryItemResponse,
    HouseholdCreateRequest,
    HouseholdMemberCreateRequest,
    HouseholdMemberResponse,
    HouseholdResponse,
    InsuranceCreateRequest,
    InsuranceResponse,
    InventoryItemCreateRequest,
    InventoryItemResponse,
    MaintenanceCreateRequest,
    MaintenanceResponse,
    NotificationCreateRequest,
    NotificationResponse,
    PaginatedResponse,
    ParentHealthRecordCreateRequest,
    ParentHealthRecordResponse,
    ReminderCreateRequest,
    ReminderResponse,
    SubscriptionCreateRequest,
    SubscriptionResponse,
    UserContextResponse,
    UserCreateRequest,
    UserResponse,
    VehicleCreateRequest,
    VehicleResponse,
    WarrantyCreateRequest,
    WarrantyResponse,
)
from app.schemas.document_extraction import (
    DocumentPipelineResult,
    SupportedExtractionCategory,
)
from app.services.household_services import HouseholdPlatformService

api_v1_router = APIRouter()


def get_platform_service(
    session: AsyncSession = Depends(get_db_session),
    ctx: AuthenticatedContext = Depends(get_current_context),
) -> HouseholdPlatformService:
    return HouseholdPlatformService(session, ctx)


# -----------------------------------------------------------------------------
# 1. Authentication / User Context
# -----------------------------------------------------------------------------
auth_router = APIRouter(prefix="/auth", tags=["01. Authentication & User Context"])


@auth_router.get("/me", response_model=UserContextResponse)
async def get_me(ctx: AuthenticatedContext = Depends(get_current_context)) -> UserContextResponse:
    return UserContextResponse(
        user_id=ctx.user_id,
        email=ctx.email,
        full_name=ctx.full_name,
        household_id=ctx.household_id,
        role=ctx.role,
        can_approve_agent_actions=ctx.can_approve_agent_actions,
    )


@auth_router.post("/token")
async def issue_token(
    user_id: uuid.UUID = Query(default=uuid.UUID("11111111-1111-4111-8111-111111111101")),
    household_id: uuid.UUID = Query(default=uuid.UUID("22222222-2222-4222-8222-222222222201")),
    role: HouseholdRole = Query(default=HouseholdRole.OWNER),
) -> dict[str, str]:
    token = create_signed_access_token(
        user_id=user_id,
        household_id=household_id,
        role=role,
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": str(user_id),
        "household_id": str(household_id),
        "role": role.value,
    }


@auth_router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    payload: UserCreateRequest,
    svc: HouseholdPlatformService = Depends(get_platform_service),
) -> UserResponse:
    user = await svc.register_user(payload)
    await svc.session.commit()
    return UserResponse.model_validate(user)


# -----------------------------------------------------------------------------
# 2. Households
# -----------------------------------------------------------------------------
households_router = APIRouter(prefix="/households", tags=["02. Households"])


@households_router.get("", response_model=list[HouseholdResponse])
async def list_households(
    svc: HouseholdPlatformService = Depends(get_platform_service),
) -> list[HouseholdResponse]:
    items = await svc.list_user_households()
    return [HouseholdResponse.model_validate(h) for h in items]


@households_router.post("", response_model=HouseholdResponse, status_code=status.HTTP_201_CREATED)
async def create_household(
    payload: HouseholdCreateRequest,
    svc: HouseholdPlatformService = Depends(get_platform_service),
) -> HouseholdResponse:
    household = await svc.create_household(payload)
    await svc.session.commit()
    return HouseholdResponse.model_validate(household)


# -----------------------------------------------------------------------------
# 3. Household Members
# -----------------------------------------------------------------------------
members_router = APIRouter(prefix="/household-members", tags=["03. Household Members"])


@members_router.get("", response_model=PaginatedResponse[HouseholdMemberResponse])
async def list_members(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    svc: HouseholdPlatformService = Depends(get_platform_service),
) -> PaginatedResponse[HouseholdMemberResponse]:
    items, total = await svc.list_members(offset=offset, limit=limit)
    return PaginatedResponse(
        items=[HouseholdMemberResponse.model_validate(m) for m in items],
        total=total,
        offset=offset,
        limit=limit,
    )


@members_router.post("", response_model=HouseholdMemberResponse, status_code=status.HTTP_201_CREATED)
async def add_member(
    payload: HouseholdMemberCreateRequest,
    svc: HouseholdPlatformService = Depends(get_platform_service),
) -> HouseholdMemberResponse:
    member = await svc.add_member(payload)
    await svc.session.commit()
    return HouseholdMemberResponse.model_validate(member)


# -----------------------------------------------------------------------------
# 4. Assets
# -----------------------------------------------------------------------------
assets_router = APIRouter(prefix="/assets", tags=["04. Assets"])


@assets_router.get("", response_model=PaginatedResponse[AssetResponse])
async def list_assets(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    category: str | None = Query(default=None),
    svc: HouseholdPlatformService = Depends(get_platform_service),
) -> PaginatedResponse[AssetResponse]:
    items, total = await svc.list_assets(offset=offset, limit=limit, category=category)
    return PaginatedResponse(
        items=[AssetResponse.model_validate(a) for a in items],
        total=total,
        offset=offset,
        limit=limit,
    )


@assets_router.post("", response_model=AssetResponse, status_code=status.HTTP_201_CREATED)
async def create_asset(
    payload: AssetCreateRequest,
    svc: HouseholdPlatformService = Depends(get_platform_service),
) -> AssetResponse:
    asset = await svc.create_asset(payload)
    await svc.session.commit()
    return AssetResponse.model_validate(asset)


@assets_router.get("/{asset_id}/tco", response_model=AssetTCOResponse)
async def get_asset_tco(
    asset_id: uuid.UUID,
    svc: HouseholdPlatformService = Depends(get_platform_service),
) -> AssetTCOResponse:
    tco = await svc.get_asset_tco(asset_id)
    return AssetTCOResponse.model_validate(tco)


# -----------------------------------------------------------------------------
# 5. Appliances
# -----------------------------------------------------------------------------
appliances_router = APIRouter(prefix="/appliances", tags=["05. Appliances"])


@appliances_router.get("", response_model=PaginatedResponse[ApplianceResponse])
async def list_appliances(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    svc: HouseholdPlatformService = Depends(get_platform_service),
) -> PaginatedResponse[ApplianceResponse]:
    items, total = await svc.list_appliances(offset=offset, limit=limit)
    return PaginatedResponse(
        items=[ApplianceResponse.model_validate(a) for a in items],
        total=total,
        offset=offset,
        limit=limit,
    )


@appliances_router.post("", response_model=ApplianceResponse, status_code=status.HTTP_201_CREATED)
async def create_appliance(
    payload: ApplianceCreateRequest,
    svc: HouseholdPlatformService = Depends(get_platform_service),
) -> ApplianceResponse:
    appliance = await svc.create_appliance(payload)
    await svc.session.commit()
    return ApplianceResponse.model_validate(appliance)


# -----------------------------------------------------------------------------
# 6. Vehicles
# -----------------------------------------------------------------------------
vehicles_router = APIRouter(prefix="/vehicles", tags=["06. Vehicles"])


@vehicles_router.get("", response_model=PaginatedResponse[VehicleResponse])
async def list_vehicles(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    svc: HouseholdPlatformService = Depends(get_platform_service),
) -> PaginatedResponse[VehicleResponse]:
    items, total = await svc.list_vehicles(offset=offset, limit=limit)
    return PaginatedResponse(
        items=[VehicleResponse.model_validate(v) for v in items],
        total=total,
        offset=offset,
        limit=limit,
    )


@vehicles_router.post("", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
async def create_vehicle(
    payload: VehicleCreateRequest,
    svc: HouseholdPlatformService = Depends(get_platform_service),
) -> VehicleResponse:
    vehicle = await svc.create_vehicle(payload)
    await svc.session.commit()
    return VehicleResponse.model_validate(vehicle)


# -----------------------------------------------------------------------------
# 7. Inventory
# -----------------------------------------------------------------------------
inventory_router = APIRouter(prefix="/inventory", tags=["07. Inventory"])


@inventory_router.get("", response_model=PaginatedResponse[InventoryItemResponse])
async def list_inventory(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    svc: HouseholdPlatformService = Depends(get_platform_service),
) -> PaginatedResponse[InventoryItemResponse]:
    items, total = await svc.list_inventory(offset=offset, limit=limit)
    return PaginatedResponse(
        items=[InventoryItemResponse.model_validate(i) for i in items],
        total=total,
        offset=offset,
        limit=limit,
    )


@inventory_router.post("", response_model=InventoryItemResponse, status_code=status.HTTP_201_CREATED)
async def create_inventory_item(
    payload: InventoryItemCreateRequest,
    svc: HouseholdPlatformService = Depends(get_platform_service),
) -> InventoryItemResponse:
    item = await svc.create_inventory_item(payload)
    await svc.session.commit()
    return InventoryItemResponse.model_validate(item)


# -----------------------------------------------------------------------------
# 8. Groceries
# -----------------------------------------------------------------------------
groceries_router = APIRouter(prefix="/groceries", tags=["08. Groceries"])


@groceries_router.get("", response_model=PaginatedResponse[GroceryItemResponse])
async def list_groceries(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    svc: HouseholdPlatformService = Depends(get_platform_service),
) -> PaginatedResponse[GroceryItemResponse]:
    items, total = await svc.list_groceries(offset=offset, limit=limit)
    return PaginatedResponse(
        items=[GroceryItemResponse.model_validate(g) for g in items],
        total=total,
        offset=offset,
        limit=limit,
    )


@groceries_router.post("", response_model=GroceryItemResponse, status_code=status.HTTP_201_CREATED)
async def create_grocery_item(
    payload: GroceryItemCreateRequest,
    svc: HouseholdPlatformService = Depends(get_platform_service),
) -> GroceryItemResponse:
    item = await svc.create_grocery_item(payload)
    await svc.session.commit()
    return GroceryItemResponse.model_validate(item)


# -----------------------------------------------------------------------------
# 9. Clothing
# -----------------------------------------------------------------------------
clothing_router = APIRouter(prefix="/clothing", tags=["09. Clothing"])


@clothing_router.get("", response_model=PaginatedResponse[ClothingItemResponse])
async def list_clothing(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    svc: HouseholdPlatformService = Depends(get_platform_service),
) -> PaginatedResponse[ClothingItemResponse]:
    items, total = await svc.list_clothing(offset=offset, limit=limit)
    return PaginatedResponse(
        items=[ClothingItemResponse.model_validate(c) for c in items],
        total=total,
        offset=offset,
        limit=limit,
    )


@clothing_router.post("", response_model=ClothingItemResponse, status_code=status.HTTP_201_CREATED)
async def create_clothing_item(
    payload: ClothingItemCreateRequest,
    svc: HouseholdPlatformService = Depends(get_platform_service),
) -> ClothingItemResponse:
    item = await svc.create_clothing_item(payload)
    await svc.session.commit()
    return ClothingItemResponse.model_validate(item)


# -----------------------------------------------------------------------------
# 10. Bills
# -----------------------------------------------------------------------------
bills_router = APIRouter(prefix="/bills", tags=["10. Bills"])


@bills_router.get("", response_model=PaginatedResponse[BillResponse])
async def list_bills(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    svc: HouseholdPlatformService = Depends(get_platform_service),
) -> PaginatedResponse[BillResponse]:
    items, total = await svc.list_bills(offset=offset, limit=limit)
    return PaginatedResponse(
        items=[BillResponse.model_validate(b) for b in items],
        total=total,
        offset=offset,
        limit=limit,
    )


@bills_router.post("", response_model=BillResponse, status_code=status.HTTP_201_CREATED)
async def create_bill(
    payload: BillCreateRequest,
    svc: HouseholdPlatformService = Depends(get_platform_service),
) -> BillResponse:
    bill = await svc.create_bill(payload)
    await svc.session.commit()
    return BillResponse.model_validate(bill)


# -----------------------------------------------------------------------------
# 11. Expenses
# -----------------------------------------------------------------------------
expenses_router = APIRouter(prefix="/expenses", tags=["11. Expenses"])


@expenses_router.get("", response_model=PaginatedResponse[ExpenseResponse])
async def list_expenses(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    svc: HouseholdPlatformService = Depends(get_platform_service),
) -> PaginatedResponse[ExpenseResponse]:
    items, total = await svc.list_expenses(offset=offset, limit=limit)
    return PaginatedResponse(
        items=[ExpenseResponse.model_validate(e) for e in items],
        total=total,
        offset=offset,
        limit=limit,
    )


@expenses_router.post("", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_expense(
    payload: ExpenseCreateRequest,
    svc: HouseholdPlatformService = Depends(get_platform_service),
) -> ExpenseResponse:
    expense = await svc.create_expense(payload)
    await svc.session.commit()
    return ExpenseResponse.model_validate(expense)


# -----------------------------------------------------------------------------
# 12. Subscriptions
# -----------------------------------------------------------------------------
subscriptions_router = APIRouter(prefix="/subscriptions", tags=["12. Subscriptions"])


@subscriptions_router.get("", response_model=PaginatedResponse[SubscriptionResponse])
async def list_subscriptions(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    svc: HouseholdPlatformService = Depends(get_platform_service),
) -> PaginatedResponse[SubscriptionResponse]:
    items, total = await svc.list_subscriptions(offset=offset, limit=limit)
    return PaginatedResponse(
        items=[SubscriptionResponse.model_validate(s) for s in items],
        total=total,
        offset=offset,
        limit=limit,
    )


@subscriptions_router.post("", response_model=SubscriptionResponse, status_code=status.HTTP_201_CREATED)
async def create_subscription(
    payload: SubscriptionCreateRequest,
    svc: HouseholdPlatformService = Depends(get_platform_service),
) -> SubscriptionResponse:
    sub = await svc.create_subscription(payload)
    await svc.session.commit()
    return SubscriptionResponse.model_validate(sub)


# -----------------------------------------------------------------------------
# 13. Maintenance
# -----------------------------------------------------------------------------
maintenance_router = APIRouter(prefix="/maintenance", tags=["13. Maintenance"])


@maintenance_router.get("", response_model=PaginatedResponse[MaintenanceResponse])
async def list_maintenance(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    svc: HouseholdPlatformService = Depends(get_platform_service),
) -> PaginatedResponse[MaintenanceResponse]:
    items, total = await svc.list_maintenance(offset=offset, limit=limit)
    return PaginatedResponse(
        items=[MaintenanceResponse.model_validate(m) for m in items],
        total=total,
        offset=offset,
        limit=limit,
    )


@maintenance_router.post("", response_model=MaintenanceResponse, status_code=status.HTTP_201_CREATED)
async def create_maintenance(
    payload: MaintenanceCreateRequest,
    svc: HouseholdPlatformService = Depends(get_platform_service),
) -> MaintenanceResponse:
    record = await svc.create_maintenance_record(payload)
    await svc.session.commit()
    return MaintenanceResponse.model_validate(record)


# -----------------------------------------------------------------------------
# 14. Documents & Gemini Document Intelligence Pipeline
# -----------------------------------------------------------------------------
documents_router = APIRouter(prefix="/documents", tags=["14. Documents & Intelligence Pipeline"])


@documents_router.get("", response_model=PaginatedResponse[DocumentResponse])
async def list_documents(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    svc: HouseholdPlatformService = Depends(get_platform_service),
) -> PaginatedResponse[DocumentResponse]:
    items, total = await svc.list_documents(offset=offset, limit=limit)
    return PaginatedResponse(
        items=[DocumentResponse.model_validate(d) for d in items],
        total=total,
        offset=offset,
        limit=limit,
    )


@documents_router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def create_document(
    payload: DocumentCreateRequest,
    svc: HouseholdPlatformService = Depends(get_platform_service),
) -> DocumentResponse:
    doc = await svc.create_document(payload)
    await svc.session.commit()
    return DocumentResponse.model_validate(doc)


@documents_router.post(
    "/ingest",
    response_model=DocumentPipelineResult,
    status_code=status.HTTP_201_CREATED,
)
async def ingest_document_with_gemini(
    file: UploadFile = File(...),
    asset_id: uuid.UUID | None = Form(default=None),
    expected_category: SupportedExtractionCategory | None = Form(default=None),
    session: AsyncSession = Depends(get_db_session),
    ctx: AuthenticatedContext = Depends(get_current_context),
) -> DocumentPipelineResult:
    content_bytes = await file.read()
    pipeline = DocumentIntelligencePipeline(session=session)
    result = await pipeline.process_document(
        household_id=ctx.household_id,
        uploaded_by_user_id=ctx.user_id,
        filename=file.filename or "uploaded_document.pdf",
        content_bytes=content_bytes,
        mime_type=file.content_type or "application/pdf",
        asset_id=asset_id,
        expected_category=expected_category,
    )
    await session.commit()
    return result


# -----------------------------------------------------------------------------
# 15. Warranties
# -----------------------------------------------------------------------------
warranties_router = APIRouter(prefix="/warranties", tags=["15. Warranties"])


@warranties_router.get("", response_model=PaginatedResponse[WarrantyResponse])
async def list_warranties(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    svc: HouseholdPlatformService = Depends(get_platform_service),
) -> PaginatedResponse[WarrantyResponse]:
    items, total = await svc.list_warranties(offset=offset, limit=limit)
    return PaginatedResponse(
        items=[WarrantyResponse.model_validate(w) for w in items],
        total=total,
        offset=offset,
        limit=limit,
    )


@warranties_router.post("", response_model=WarrantyResponse, status_code=status.HTTP_201_CREATED)
async def create_warranty(
    payload: WarrantyCreateRequest,
    svc: HouseholdPlatformService = Depends(get_platform_service),
) -> WarrantyResponse:
    warranty = await svc.create_warranty(payload)
    await svc.session.commit()
    return WarrantyResponse.model_validate(warranty)


# -----------------------------------------------------------------------------
# 16. Insurance Policies
# -----------------------------------------------------------------------------
insurance_router = APIRouter(prefix="/insurance", tags=["16. Insurance Policies"])


@insurance_router.get("", response_model=PaginatedResponse[InsuranceResponse])
async def list_insurance(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    svc: HouseholdPlatformService = Depends(get_platform_service),
) -> PaginatedResponse[InsuranceResponse]:
    items, total = await svc.list_insurance_policies(offset=offset, limit=limit)
    return PaginatedResponse(
        items=[InsuranceResponse.model_validate(p) for p in items],
        total=total,
        offset=offset,
        limit=limit,
    )


@insurance_router.post("", response_model=InsuranceResponse, status_code=status.HTTP_201_CREATED)
async def create_insurance(
    payload: InsuranceCreateRequest,
    svc: HouseholdPlatformService = Depends(get_platform_service),
) -> InsuranceResponse:
    policy = await svc.create_insurance_policy(payload)
    await svc.session.commit()
    return InsuranceResponse.model_validate(policy)


# -----------------------------------------------------------------------------
# 17. Reminders
# -----------------------------------------------------------------------------
reminders_router = APIRouter(prefix="/reminders", tags=["17. Reminders"])


@reminders_router.get("", response_model=PaginatedResponse[ReminderResponse])
async def list_reminders(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    svc: HouseholdPlatformService = Depends(get_platform_service),
) -> PaginatedResponse[ReminderResponse]:
    items, total = await svc.list_reminders(offset=offset, limit=limit)
    return PaginatedResponse(
        items=[ReminderResponse.model_validate(r) for r in items],
        total=total,
        offset=offset,
        limit=limit,
    )


@reminders_router.post("", response_model=ReminderResponse, status_code=status.HTTP_201_CREATED)
async def create_reminder(
    payload: ReminderCreateRequest,
    svc: HouseholdPlatformService = Depends(get_platform_service),
) -> ReminderResponse:
    reminder = await svc.create_reminder(payload)
    await svc.session.commit()
    return ReminderResponse.model_validate(reminder)


@reminders_router.post("/{reminder_id}/complete", response_model=ReminderResponse)
async def complete_reminder(
    reminder_id: uuid.UUID,
    svc: HouseholdPlatformService = Depends(get_platform_service),
) -> ReminderResponse:
    reminder = await svc.complete_reminder(reminder_id)
    await svc.session.commit()
    return ReminderResponse.model_validate(reminder)


# -----------------------------------------------------------------------------
# 18. Notifications
# -----------------------------------------------------------------------------
notifications_router = APIRouter(prefix="/notifications", tags=["18. Notifications"])


@notifications_router.get("", response_model=PaginatedResponse[NotificationResponse])
async def list_notifications(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    svc: HouseholdPlatformService = Depends(get_platform_service),
) -> PaginatedResponse[NotificationResponse]:
    items, total = await svc.list_notifications(offset=offset, limit=limit)
    return PaginatedResponse(
        items=[NotificationResponse.model_validate(n) for n in items],
        total=total,
        offset=offset,
        limit=limit,
    )


@notifications_router.post("", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
async def create_notification(
    payload: NotificationCreateRequest,
    svc: HouseholdPlatformService = Depends(get_platform_service),
) -> NotificationResponse:
    notif = await svc.create_notification(payload)
    await svc.session.commit()
    return NotificationResponse.model_validate(notif)


@notifications_router.post("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: uuid.UUID,
    svc: HouseholdPlatformService = Depends(get_platform_service),
) -> NotificationResponse:
    notif = await svc.mark_notification_read(notification_id)
    await svc.session.commit()
    return NotificationResponse.model_validate(notif)


# -----------------------------------------------------------------------------
# 19. Parents' Health Monitoring Records
# -----------------------------------------------------------------------------
parents_health_router = APIRouter(
    prefix="/parents-health",
    tags=["19. Parents' Health Monitoring"],
)


@parents_health_router.get("", response_model=PaginatedResponse[ParentHealthRecordResponse])
async def list_parents_health_records(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    svc: HouseholdPlatformService = Depends(get_platform_service),
) -> PaginatedResponse[ParentHealthRecordResponse]:
    items, total = await svc.list_parent_health_records(offset=offset, limit=limit)
    return PaginatedResponse(
        items=[ParentHealthRecordResponse.model_validate(r) for r in items],
        total=total,
        offset=offset,
        limit=limit,
    )


@parents_health_router.post(
    "",
    response_model=ParentHealthRecordResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_parents_health_record(
    payload: ParentHealthRecordCreateRequest,
    svc: HouseholdPlatformService = Depends(get_platform_service),
) -> ParentHealthRecordResponse:
    record = await svc.create_parent_health_record(payload)
    await svc.session.commit()
    return ParentHealthRecordResponse.model_validate(record)


# Register all routers onto api_v1_router
for router in [
    auth_router,
    households_router,
    members_router,
    assets_router,
    appliances_router,
    vehicles_router,
    inventory_router,
    groceries_router,
    clothing_router,
    bills_router,
    expenses_router,
    subscriptions_router,
    maintenance_router,
    documents_router,
    warranties_router,
    insurance_router,
    reminders_router,
    notifications_router,
    parents_health_router,
]:
    api_v1_router.include_router(router)
