"""
HomeIQ — Pydantic v2 Request/Response Schemas for All 18 API Modules.
"""
from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Generic, TypeVar

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

from app.db.enums import (
    ApplianceType,
    AssetCategory,
    AssetStatus,
    BillCategory,
    BillingCycle,
    BillStatus,
    DocumentType,
    ExpenseCategory,
    FuelType,
    GarmentCategory,
    GroceryCategory,
    HouseholdRole,
    InsuranceType,
    LaundryStatus,
    MaintenanceStatus,
    MaintenanceType,
    MeasurementUnit,
    NotificationChannel,
    NotificationStatus,
    ParentHealthRecordCategory,
    ParentHealthRecordStatus,
    PaymentMethod,
    ReminderPriority,
    ReminderStatus,
    StockStatus,
    StorageLocation,
    SubscriptionStatus,
    TravelRecordCategory,
    TravelRecordStatus,
    TravelTransportMode,
    VehicleType,
    WarrantyStatus,
    WarrantyType,
    WashCareMethod,
)

SchemaT = TypeVar("SchemaT")


class ORMBaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid", populate_by_name=True)


class PaginatedResponse(BaseModel, Generic[SchemaT]):
    items: list[SchemaT]
    total: int
    offset: int
    limit: int


# -----------------------------------------------------------------------------
# 1. Authentication / User Context
# -----------------------------------------------------------------------------
class UserContextResponse(ORMBaseSchema):
    user_id: uuid.UUID
    email: EmailStr
    full_name: str
    household_id: uuid.UUID
    role: HouseholdRole
    can_approve_agent_actions: bool


class UserCreateRequest(ORMBaseSchema):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=160)
    password: str = Field(min_length=8, max_length=128)
    phone_number: str | None = None
    preferred_locale: str = "en-IN"
    timezone: str = "Asia/Kolkata"


class UserResponse(ORMBaseSchema):
    id: uuid.UUID
    email: EmailStr
    full_name: str
    phone_number: str | None
    preferred_locale: str
    timezone: str
    is_active: bool
    created_at: datetime


# -----------------------------------------------------------------------------
# 2. Households
# -----------------------------------------------------------------------------
class HouseholdCreateRequest(ORMBaseSchema):
    name: str = Field(min_length=2, max_length=160)
    slug: str = Field(min_length=2, max_length=160, pattern=r"^[a-z0-9-]+$")
    currency_code: str = Field(default="INR", min_length=3, max_length=3)
    timezone: str = "Asia/Kolkata"
    city: str | None = None
    state_region: str | None = None
    country_code: str = Field(default="IN", min_length=2, max_length=2)
    monthly_budget_minor: int = Field(default=0, ge=0)


class HouseholdResponse(ORMBaseSchema):
    id: uuid.UUID
    name: str
    slug: str
    currency_code: str
    timezone: str
    city: str | None
    state_region: str | None
    country_code: str
    monthly_budget_minor: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


# -----------------------------------------------------------------------------
# 3. Household Members
# -----------------------------------------------------------------------------
class HouseholdMemberCreateRequest(ORMBaseSchema):
    user_id: uuid.UUID
    role: HouseholdRole = HouseholdRole.ADULT_MEMBER
    nickname: str | None = Field(default=None, max_length=80)
    can_approve_agent_actions: bool = False
    is_primary_contact: bool = False


class HouseholdMemberResponse(ORMBaseSchema):
    id: uuid.UUID
    household_id: uuid.UUID
    user_id: uuid.UUID
    role: HouseholdRole
    nickname: str | None
    can_approve_agent_actions: bool
    is_primary_contact: bool
    joined_at: datetime


# -----------------------------------------------------------------------------
# 4. Assets
# -----------------------------------------------------------------------------
class AssetCreateRequest(ORMBaseSchema):
    asset_tag: str = Field(min_length=2, max_length=64)
    name: str = Field(min_length=2, max_length=180)
    category: AssetCategory
    status: AssetStatus = AssetStatus.ACTIVE
    brand: str | None = None
    model_number: str | None = None
    serial_number: str | None = None
    location_in_home: str | None = None
    purchase_date: date | None = None
    purchase_price_minor: int = Field(default=0, ge=0)
    vendor_name: str | None = None
    expected_lifespan_months: int | None = Field(default=None, gt=0)
    notes: str | None = None


class AssetResponse(ORMBaseSchema):
    id: uuid.UUID
    household_id: uuid.UUID
    asset_tag: str
    name: str
    category: AssetCategory
    status: AssetStatus
    brand: str | None
    model_number: str | None
    serial_number: str | None
    location_in_home: str | None
    purchase_date: date | None
    purchase_price_minor: int
    vendor_name: str | None
    expected_lifespan_months: int | None
    notes: str | None
    created_at: datetime
    updated_at: datetime


class AssetTCOResponse(ORMBaseSchema):
    asset_id: uuid.UUID
    asset_tag: str
    name: str
    purchase_price_minor: int
    maintenance_cost_minor: int
    direct_expenses_minor: int
    total_tco_minor: int


# -----------------------------------------------------------------------------
# 5. Appliances
# -----------------------------------------------------------------------------
class ApplianceCreateRequest(ORMBaseSchema):
    asset_id: uuid.UUID
    appliance_type: ApplianceType
    energy_star_rating: int | None = Field(default=None, ge=1, le=5)
    rated_wattage: int | None = Field(default=None, gt=0)
    service_interval_days: int = Field(default=180, gt=0)
    last_serviced_date: date | None = None
    next_service_due_date: date | None = None
    smart_integration_id: str | None = None


class ApplianceResponse(ORMBaseSchema):
    id: uuid.UUID
    household_id: uuid.UUID
    asset_id: uuid.UUID
    appliance_type: ApplianceType
    energy_star_rating: int | None
    rated_wattage: int | None
    service_interval_days: int
    last_serviced_date: date | None
    next_service_due_date: date | None
    smart_integration_id: str | None
    created_at: datetime


# -----------------------------------------------------------------------------
# 6. Vehicles
# -----------------------------------------------------------------------------
class VehicleCreateRequest(ORMBaseSchema):
    asset_id: uuid.UUID
    vehicle_type: VehicleType
    registration_number: str = Field(min_length=4, max_length=32)
    vin_chassis_number: str | None = None
    engine_or_motor_number: str | None = None
    fuel_type: FuelType
    manufacturing_year: int | None = Field(default=None, ge=1980, le=2035)
    odometer_km: int = Field(default=0, ge=0)
    service_interval_km: int = Field(default=10000, gt=0)
    last_service_odometer_km: int = Field(default=0, ge=0)
    pollution_cert_expiry_date: date | None = None
    registration_valid_until: date | None = None


class VehicleResponse(ORMBaseSchema):
    id: uuid.UUID
    household_id: uuid.UUID
    asset_id: uuid.UUID
    vehicle_type: VehicleType
    registration_number: str
    vin_chassis_number: str | None
    engine_or_motor_number: str | None
    fuel_type: FuelType
    manufacturing_year: int | None
    odometer_km: int
    service_interval_km: int
    last_service_odometer_km: int
    pollution_cert_expiry_date: date | None
    registration_valid_until: date | None
    created_at: datetime


# -----------------------------------------------------------------------------
# 7. Inventory
# -----------------------------------------------------------------------------
class InventoryItemCreateRequest(ORMBaseSchema):
    name: str = Field(min_length=1, max_length=160)
    sku_or_barcode: str | None = None
    category: GroceryCategory = GroceryCategory.OTHER
    storage_location: StorageLocation = StorageLocation.PANTRY
    quantity_on_hand: Decimal = Field(default=Decimal("0.000"), ge=0)
    unit: MeasurementUnit = MeasurementUnit.PIECE
    reorder_threshold: Decimal = Field(default=Decimal("1.000"), ge=0)
    expiry_date: date | None = None


class InventoryItemResponse(ORMBaseSchema):
    id: uuid.UUID
    household_id: uuid.UUID
    name: str
    sku_or_barcode: str | None
    category: GroceryCategory
    storage_location: StorageLocation
    quantity_on_hand: Decimal
    unit: MeasurementUnit
    reorder_threshold: Decimal
    stock_status: StockStatus
    expiry_date: date | None
    created_at: datetime


# -----------------------------------------------------------------------------
# 8. Groceries
# -----------------------------------------------------------------------------
class GroceryItemCreateRequest(ORMBaseSchema):
    inventory_item_id: uuid.UUID | None = None
    name: str = Field(min_length=1, max_length=160)
    category: GroceryCategory = GroceryCategory.PRODUCE
    planned_quantity: Decimal = Field(default=Decimal("1.000"), gt=0)
    unit: MeasurementUnit = MeasurementUnit.PIECE
    estimated_unit_price_minor: int = Field(default=0, ge=0)
    preferred_store: str | None = None
    added_reason: str | None = None


class GroceryItemResponse(ORMBaseSchema):
    id: uuid.UUID
    household_id: uuid.UUID
    inventory_item_id: uuid.UUID | None
    name: str
    category: GroceryCategory
    planned_quantity: Decimal
    unit: MeasurementUnit
    estimated_unit_price_minor: int
    preferred_store: str | None
    is_purchased: bool
    purchased_at: datetime | None
    added_reason: str | None
    created_at: datetime


# -----------------------------------------------------------------------------
# 9. Clothing
# -----------------------------------------------------------------------------
class ClothingItemCreateRequest(ORMBaseSchema):
    owner_member_id: uuid.UUID | None = None
    name: str = Field(min_length=1, max_length=160)
    category: GarmentCategory
    fabric_composition: str = Field(min_length=1, max_length=120)
    color_group: str = Field(min_length=1, max_length=64)
    wash_care_method: WashCareMethod = WashCareMethod.MACHINE_WASH_COLD
    max_wash_temp_celsius: int = Field(default=30, gt=0, le=95)
    can_tumble_dry: bool = False
    requires_ironing: bool = False
    laundry_status: LaundryStatus = LaundryStatus.CLEAN_IN_WARDROBE


class ClothingItemResponse(ORMBaseSchema):
    id: uuid.UUID
    household_id: uuid.UUID
    owner_member_id: uuid.UUID | None
    name: str
    category: GarmentCategory
    fabric_composition: str
    color_group: str
    wash_care_method: WashCareMethod
    max_wash_temp_celsius: int
    can_tumble_dry: bool
    requires_ironing: bool
    laundry_status: LaundryStatus
    wear_count_since_wash: int
    created_at: datetime


# -----------------------------------------------------------------------------
# 10. Bills
# -----------------------------------------------------------------------------
class BillCreateRequest(ORMBaseSchema):
    document_id: uuid.UUID | None = None
    category: BillCategory
    provider_name: str = Field(min_length=2, max_length=160)
    consumer_account_number: str = Field(min_length=2, max_length=80)
    invoice_number: str | None = None
    billing_period_start: date | None = None
    billing_period_end: date | None = None
    due_date: date
    amount_due_minor: int = Field(ge=0)
    units_consumed: Decimal | None = None
    unit_measure: str | None = None
    status: BillStatus = BillStatus.PENDING_PAYMENT
    autopay_enabled: bool = False

    @model_validator(mode="after")
    def validate_period(self) -> BillCreateRequest:
        if (
            self.billing_period_start
            and self.billing_period_end
            and self.billing_period_end < self.billing_period_start
        ):
            raise ValueError("billing_period_end must be on or after billing_period_start")
        return self


class BillResponse(ORMBaseSchema):
    id: uuid.UUID
    household_id: uuid.UUID
    document_id: uuid.UUID | None
    category: BillCategory
    provider_name: str
    consumer_account_number: str
    invoice_number: str | None
    billing_period_start: date | None
    billing_period_end: date | None
    due_date: date
    amount_due_minor: int
    units_consumed: Decimal | None
    unit_measure: str | None
    status: BillStatus
    autopay_enabled: bool
    paid_at: datetime | None
    created_at: datetime


# -----------------------------------------------------------------------------
# 11. Expenses
# -----------------------------------------------------------------------------
class ExpenseCreateRequest(ORMBaseSchema):
    asset_id: uuid.UUID | None = None
    bill_id: uuid.UUID | None = None
    subscription_id: uuid.UUID | None = None
    maintenance_record_id: uuid.UUID | None = None
    receipt_document_id: uuid.UUID | None = None
    category: ExpenseCategory
    amount_minor: int = Field(gt=0)
    currency_code: str = Field(default="INR", min_length=3, max_length=3)
    merchant_name: str = Field(min_length=1, max_length=160)
    description: str | None = None
    incurred_on: date
    payment_method: PaymentMethod = PaymentMethod.UPI
    reference_transaction_id: str | None = None


class ExpenseResponse(ORMBaseSchema):
    id: uuid.UUID
    household_id: uuid.UUID
    asset_id: uuid.UUID | None
    bill_id: uuid.UUID | None
    subscription_id: uuid.UUID | None
    maintenance_record_id: uuid.UUID | None
    receipt_document_id: uuid.UUID | None
    paid_by_user_id: uuid.UUID | None
    category: ExpenseCategory
    amount_minor: int
    currency_code: str
    merchant_name: str
    description: str | None
    incurred_on: date
    payment_method: PaymentMethod
    reference_transaction_id: str | None
    is_reconciled: bool
    created_at: datetime


# -----------------------------------------------------------------------------
# 12. Subscriptions
# -----------------------------------------------------------------------------
class SubscriptionCreateRequest(ORMBaseSchema):
    name: str = Field(min_length=2, max_length=160)
    provider_name: str = Field(min_length=2, max_length=160)
    billing_cycle: BillingCycle = BillingCycle.MONTHLY
    recurring_amount_minor: int = Field(ge=0)
    currency_code: str = "INR"
    start_date: date
    next_renewal_date: date
    status: SubscriptionStatus = SubscriptionStatus.ACTIVE
    auto_renew: bool = True
    payment_method: PaymentMethod = PaymentMethod.UPI
    notes: str | None = None


class SubscriptionResponse(ORMBaseSchema):
    id: uuid.UUID
    household_id: uuid.UUID
    name: str
    provider_name: str
    billing_cycle: BillingCycle
    recurring_amount_minor: int
    currency_code: str
    start_date: date
    next_renewal_date: date
    status: SubscriptionStatus
    auto_renew: bool
    payment_method: PaymentMethod
    notes: str | None
    created_at: datetime


# -----------------------------------------------------------------------------
# 13. Maintenance
# -----------------------------------------------------------------------------
class MaintenanceCreateRequest(ORMBaseSchema):
    asset_id: uuid.UUID
    warranty_id: uuid.UUID | None = None
    invoice_document_id: uuid.UUID | None = None
    maintenance_type: MaintenanceType
    status: MaintenanceStatus = MaintenanceStatus.SCHEDULED
    title: str = Field(min_length=2, max_length=200)
    description: str | None = None
    service_date: date
    technician_or_vendor: str | None = None
    odometer_reading_km: int | None = Field(default=None, ge=0)
    labor_cost_minor: int = Field(default=0, ge=0)
    parts_cost_minor: int = Field(default=0, ge=0)
    covered_under_warranty: bool = False
    next_recommended_service_date: date | None = None


class MaintenanceResponse(ORMBaseSchema):
    id: uuid.UUID
    household_id: uuid.UUID
    asset_id: uuid.UUID
    warranty_id: uuid.UUID | None
    invoice_document_id: uuid.UUID | None
    maintenance_type: MaintenanceType
    status: MaintenanceStatus
    title: str
    description: str | None
    service_date: date
    technician_or_vendor: str | None
    odometer_reading_km: int | None
    labor_cost_minor: int
    parts_cost_minor: int
    covered_under_warranty: bool
    next_recommended_service_date: date | None
    created_at: datetime


# -----------------------------------------------------------------------------
# 14. Documents
# -----------------------------------------------------------------------------
class DocumentCreateRequest(ORMBaseSchema):
    asset_id: uuid.UUID | None = None
    title: str = Field(min_length=2, max_length=200)
    document_type: DocumentType
    gcs_uri: str = Field(min_length=5, max_length=512)
    mime_type: str = "application/pdf"
    file_size_bytes: int = Field(default=0, ge=0)
    sha256_checksum: str = Field(min_length=8, max_length=64)
    extracted_text: str | None = None
    structured_metadata_json: dict[str, Any] | None = None
    document_date: date | None = None
    expiry_date: date | None = None


class DocumentResponse(ORMBaseSchema):
    id: uuid.UUID
    household_id: uuid.UUID
    asset_id: uuid.UUID | None
    title: str
    document_type: DocumentType
    gcs_uri: str
    mime_type: str
    file_size_bytes: int
    sha256_checksum: str
    extracted_text: str | None
    structured_metadata_json: dict[str, Any] | None
    is_indexed_for_rag: bool
    document_date: date | None
    expiry_date: date | None
    created_at: datetime


# -----------------------------------------------------------------------------
# 15. Warranties
# -----------------------------------------------------------------------------
class WarrantyCreateRequest(ORMBaseSchema):
    asset_id: uuid.UUID
    document_id: uuid.UUID | None = None
    warranty_type: WarrantyType = WarrantyType.MANUFACTURER_STANDARD
    provider_name: str = Field(min_length=2, max_length=160)
    contract_or_policy_number: str | None = None
    start_date: date
    end_date: date
    coverage_limit_minor: int = Field(default=0, ge=0)
    covers_parts: bool = True
    covers_labor: bool = True
    support_contact_phone: str | None = None
    support_contact_email: str | None = None
    status: WarrantyStatus = WarrantyStatus.ACTIVE
    terms_summary: str | None = None

    @model_validator(mode="after")
    def validate_dates(self) -> WarrantyCreateRequest:
        if self.end_date < self.start_date:
            raise ValueError("Warranty end_date must be on or after start_date")
        return self


class WarrantyResponse(ORMBaseSchema):
    id: uuid.UUID
    household_id: uuid.UUID
    asset_id: uuid.UUID
    document_id: uuid.UUID | None
    warranty_type: WarrantyType
    provider_name: str
    contract_or_policy_number: str | None
    start_date: date
    end_date: date
    coverage_limit_minor: int
    covers_parts: bool
    covers_labor: bool
    support_contact_phone: str | None
    support_contact_email: str | None
    status: WarrantyStatus
    terms_summary: str | None
    created_at: datetime


# -----------------------------------------------------------------------------
# 16. Insurance Policies
# -----------------------------------------------------------------------------
class InsuranceCreateRequest(ORMBaseSchema):
    asset_id: uuid.UUID | None = None
    document_id: uuid.UUID | None = None
    insurance_type: InsuranceType
    insurer_name: str = Field(min_length=2, max_length=160)
    policy_number: str = Field(min_length=2, max_length=120)
    start_date: date
    end_date: date
    sum_insured_minor: int = Field(gt=0)
    premium_amount_minor: int = Field(ge=0)
    deductible_minor: int = Field(default=0, ge=0)
    billing_cycle: BillingCycle = BillingCycle.ANNUAL
    is_active: bool = True
    tpa_or_claim_helpline: str | None = None

    @model_validator(mode="after")
    def validate_dates(self) -> InsuranceCreateRequest:
        if self.end_date < self.start_date:
            raise ValueError("Insurance end_date must be on or after start_date")
        return self


class InsuranceResponse(ORMBaseSchema):
    id: uuid.UUID
    household_id: uuid.UUID
    asset_id: uuid.UUID | None
    document_id: uuid.UUID | None
    insurance_type: InsuranceType
    insurer_name: str
    policy_number: str
    start_date: date
    end_date: date
    sum_insured_minor: int
    premium_amount_minor: int
    deductible_minor: int
    billing_cycle: BillingCycle
    is_active: bool
    tpa_or_claim_helpline: str | None
    created_at: datetime


# -----------------------------------------------------------------------------
# 17. Reminders
# -----------------------------------------------------------------------------
class ReminderCreateRequest(ORMBaseSchema):
    assigned_user_id: uuid.UUID | None = None
    asset_id: uuid.UUID | None = None
    bill_id: uuid.UUID | None = None
    warranty_id: uuid.UUID | None = None
    title: str = Field(min_length=2, max_length=200)
    description: str | None = None
    domain: str = Field(min_length=2, max_length=64)
    priority: ReminderPriority = ReminderPriority.MEDIUM
    status: ReminderStatus = ReminderStatus.PENDING
    due_at: datetime
    recurrence_cron: str | None = None


class ReminderResponse(ORMBaseSchema):
    id: uuid.UUID
    household_id: uuid.UUID
    assigned_user_id: uuid.UUID | None
    asset_id: uuid.UUID | None
    bill_id: uuid.UUID | None
    warranty_id: uuid.UUID | None
    title: str
    description: str | None
    domain: str
    priority: ReminderPriority
    status: ReminderStatus
    due_at: datetime
    recurrence_cron: str | None
    completed_at: datetime | None
    created_at: datetime


# -----------------------------------------------------------------------------
# 18. Notifications
# -----------------------------------------------------------------------------
class NotificationCreateRequest(ORMBaseSchema):
    recipient_user_id: uuid.UUID
    reminder_id: uuid.UUID | None = None
    channel: NotificationChannel = NotificationChannel.IN_APP
    title: str = Field(min_length=2, max_length=200)
    body: str = Field(min_length=2)
    action_url: str | None = None


class NotificationResponse(ORMBaseSchema):
    id: uuid.UUID
    household_id: uuid.UUID
    recipient_user_id: uuid.UUID
    reminder_id: uuid.UUID | None
    agent_run_id: uuid.UUID | None
    event_id: uuid.UUID | None
    channel: NotificationChannel
    status: NotificationStatus
    title: str
    body: str
    action_url: str | None
    read_at: datetime | None
    created_at: datetime


# -----------------------------------------------------------------------------
# 19. Parents' Health Monitoring Records
# -----------------------------------------------------------------------------
class ParentHealthRecordCreateRequest(ORMBaseSchema):
    document_id: uuid.UUID | None = None
    parent_name: str = Field(min_length=2, max_length=160)
    record_category: ParentHealthRecordCategory
    title: str = Field(min_length=2, max_length=200)
    provider_or_doctor: str | None = Field(default=None, max_length=160)
    recorded_date: date
    next_due_or_followup_date: date | None = None
    schedule_or_frequency: str | None = Field(default=None, max_length=120)
    explicit_measurement_value: str | None = Field(default=None, max_length=200)
    status: ParentHealthRecordStatus = ParentHealthRecordStatus.RECORDED
    notes: str | None = None


class ParentHealthRecordResponse(ORMBaseSchema):
    id: uuid.UUID
    household_id: uuid.UUID
    document_id: uuid.UUID | None
    parent_name: str
    record_category: ParentHealthRecordCategory
    title: str
    provider_or_doctor: str | None
    recorded_date: date
    next_due_or_followup_date: date | None
    schedule_or_frequency: str | None
    explicit_measurement_value: str | None
    status: ParentHealthRecordStatus
    notes: str | None
    created_at: datetime


# -----------------------------------------------------------------------------
# 20. Travel & Leisure Planning Records
# -----------------------------------------------------------------------------
class TravelRecordCreateRequest(ORMBaseSchema):
    document_id: uuid.UUID | None = None
    trip_name: str = Field(min_length=2, max_length=200)
    destination: str = Field(min_length=2, max_length=160)
    origin_city: str | None = Field(default=None, max_length=120)
    record_category: TravelRecordCategory = TravelRecordCategory.FAMILY_VACATION
    transport_mode: TravelTransportMode = TravelTransportMode.FLIGHT
    booking_reference: str = Field(min_length=2, max_length=120)
    provider_or_carrier: str | None = Field(default=None, max_length=160)
    accommodation_name: str | None = Field(default=None, max_length=200)
    departure_date: date
    return_date: date | None = None
    travelers: str | None = Field(default=None, max_length=255)
    status: TravelRecordStatus = TravelRecordStatus.UPCOMING
    expense_amount_minor: int = Field(default=0, ge=0)
    document_status: str | None = Field(default=None, max_length=160)
    important_date_label: str | None = Field(default=None, max_length=160)
    notes: str | None = None

    @model_validator(mode="after")
    def validate_dates(self) -> TravelRecordCreateRequest:
        if self.return_date is not None and self.return_date < self.departure_date:
            raise ValueError("Travel return_date must be on or after departure_date")
        return self


class TravelRecordResponse(ORMBaseSchema):
    id: uuid.UUID
    household_id: uuid.UUID
    document_id: uuid.UUID | None
    trip_name: str
    destination: str
    origin_city: str | None
    record_category: TravelRecordCategory
    transport_mode: TravelTransportMode
    booking_reference: str
    provider_or_carrier: str | None
    accommodation_name: str | None
    departure_date: date
    return_date: date | None
    travelers: str | None
    status: TravelRecordStatus
    expense_amount_minor: int
    document_status: str | None
    important_date_label: str | None
    notes: str | None
    created_at: datetime

