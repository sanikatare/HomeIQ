"""
HomeIQ — Normalized SQLAlchemy 2.0 Declarative Schema (20 Core Tables).

Tables:
 1. users
 2. households
 3. household_members
 4. assets
 5. appliances
 6. vehicles
 7. grocery_items
 8. inventory_items
 9. clothing_items
10. bills
11. expenses
12. subscriptions
13. maintenance_records
14. documents
15. warranties
16. insurance_policies
17. reminders
18. events
19. agent_runs
20. notifications
"""
from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import (
    AuditMixin,
    Base,
    HouseholdTenantMixin,
    TimestampMixin,
    UUIDPrimaryKeyMixin,
)
from app.db.enums import (
    ActionRiskLevel,
    AgentRunStatus,
    ApplianceType,
    AssetCategory,
    AssetStatus,
    BillCategory,
    BillingCycle,
    BillStatus,
    DocumentType,
    EventSeverity,
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
    PaymentMethod,
    ReminderPriority,
    ReminderStatus,
    StockStatus,
    StorageLocation,
    SubscriptionStatus,
    VehicleType,
    WarrantyStatus,
    WarrantyType,
    WashCareMethod,
)


# =============================================================================
# 1. users
# =============================================================================
class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "users"
    __table_args__ = (
        Index("ix_users_email_active", "email", "is_active"),
    )

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(160), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    phone_number: Mapped[str | None] = mapped_column(String(32), nullable=True)
    preferred_locale: Mapped[str] = mapped_column(String(16), default="en-IN", nullable=False)
    timezone: Mapped[str] = mapped_column(String(64), default="Asia/Kolkata", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    household_memberships: Mapped[list[HouseholdMember]] = relationship(
        "HouseholdMember",
        back_populates="user",
        cascade="all, delete-orphan",
        foreign_keys="HouseholdMember.user_id",
    )
    notifications: Mapped[list[Notification]] = relationship(
        "Notification",
        back_populates="recipient_user",
        cascade="all, delete-orphan",
        foreign_keys="Notification.recipient_user_id",
    )


# =============================================================================
# 2. households
# =============================================================================
class Household(UUIDPrimaryKeyMixin, AuditMixin, Base):
    __tablename__ = "households"
    __table_args__ = (
        CheckConstraint("monthly_budget_minor >= 0", name="non_negative_monthly_budget"),
        Index("ix_households_slug", "slug"),
    )

    name: Mapped[str] = mapped_column(String(160), nullable=False)
    slug: Mapped[str] = mapped_column(String(160), unique=True, nullable=False)
    currency_code: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    timezone: Mapped[str] = mapped_column(String(64), default="Asia/Kolkata", nullable=False)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state_region: Mapped[str | None] = mapped_column(String(100), nullable=True)
    country_code: Mapped[str] = mapped_column(String(2), default="IN", nullable=False)
    monthly_budget_minor: Mapped[int] = mapped_column(
        BigInteger,
        default=0,
        nullable=False,
        doc="Monthly household target budget stored in minor currency units (paise/cents).",
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    members: Mapped[list[HouseholdMember]] = relationship(
        "HouseholdMember",
        back_populates="household",
        cascade="all, delete-orphan",
    )
    assets: Mapped[list[Asset]] = relationship(
        "Asset",
        back_populates="household",
        cascade="all, delete-orphan",
    )
    grocery_items: Mapped[list[GroceryItem]] = relationship(
        "GroceryItem",
        back_populates="household",
        cascade="all, delete-orphan",
    )
    inventory_items: Mapped[list[InventoryItem]] = relationship(
        "InventoryItem",
        back_populates="household",
        cascade="all, delete-orphan",
    )
    clothing_items: Mapped[list[ClothingItem]] = relationship(
        "ClothingItem",
        back_populates="household",
        cascade="all, delete-orphan",
    )
    bills: Mapped[list[Bill]] = relationship(
        "Bill",
        back_populates="household",
        cascade="all, delete-orphan",
    )
    expenses: Mapped[list[Expense]] = relationship(
        "Expense",
        back_populates="household",
        cascade="all, delete-orphan",
    )
    subscriptions: Mapped[list[Subscription]] = relationship(
        "Subscription",
        back_populates="household",
        cascade="all, delete-orphan",
    )
    maintenance_records: Mapped[list[MaintenanceRecord]] = relationship(
        "MaintenanceRecord",
        back_populates="household",
        cascade="all, delete-orphan",
    )
    documents: Mapped[list[Document]] = relationship(
        "Document",
        back_populates="household",
        cascade="all, delete-orphan",
    )
    warranties: Mapped[list[Warranty]] = relationship(
        "Warranty",
        back_populates="household",
        cascade="all, delete-orphan",
    )
    insurance_policies: Mapped[list[InsurancePolicy]] = relationship(
        "InsurancePolicy",
        back_populates="household",
        cascade="all, delete-orphan",
    )
    reminders: Mapped[list[Reminder]] = relationship(
        "Reminder",
        back_populates="household",
        cascade="all, delete-orphan",
    )
    events: Mapped[list[Event]] = relationship(
        "Event",
        back_populates="household",
        cascade="all, delete-orphan",
    )
    agent_runs: Mapped[list[AgentRun]] = relationship(
        "AgentRun",
        back_populates="household",
        cascade="all, delete-orphan",
    )
    notifications: Mapped[list[Notification]] = relationship(
        "Notification",
        back_populates="household",
        cascade="all, delete-orphan",
    )


# =============================================================================
# 3. household_members
# =============================================================================
class HouseholdMember(HouseholdTenantMixin, Base):
    __tablename__ = "household_members"
    __table_args__ = (
        UniqueConstraint("household_id", "user_id", name="uq_household_members_household_user"),
        Index("ix_household_members_household_role", "household_id", "role"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[HouseholdRole] = mapped_column(
        Enum(HouseholdRole, name="household_role_enum", native_enum=False),
        default=HouseholdRole.ADULT_MEMBER,
        nullable=False,
    )
    nickname: Mapped[str | None] = mapped_column(String(80), nullable=True)
    can_approve_agent_actions: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_primary_contact: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    household: Mapped[Household] = relationship("Household", back_populates="members")
    user: Mapped[User] = relationship(
        "User",
        back_populates="household_memberships",
        foreign_keys=[user_id],
    )
    clothing_items: Mapped[list[ClothingItem]] = relationship(
        "ClothingItem",
        back_populates="owner_member",
    )


# =============================================================================
# 4. assets (Canonical Base Registry for Appliances, Vehicles & Home Assets)
# =============================================================================
class Asset(HouseholdTenantMixin, Base):
    """
    Canonical household asset entity.
    Enables unified association of documents, expenses, maintenance_records,
    warranties, insurance_policies, and reminders across appliances, vehicles,
    electronics, and structural equipment.
    """

    __tablename__ = "assets"
    __table_args__ = (
        CheckConstraint("purchase_price_minor >= 0", name="non_negative_asset_purchase_price"),
        UniqueConstraint(
            "household_id",
            "asset_tag",
            name="uq_assets_household_asset_tag",
        ),
        Index("ix_assets_household_category_status", "household_id", "category", "status"),
    )

    asset_tag: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        doc="Human-readable household asset identifier (e.g., AST-kit-dish-01).",
    )
    name: Mapped[str] = mapped_column(String(180), nullable=False)
    category: Mapped[AssetCategory] = mapped_column(
        Enum(AssetCategory, name="asset_category_enum", native_enum=False),
        nullable=False,
    )
    status: Mapped[AssetStatus] = mapped_column(
        Enum(AssetStatus, name="asset_status_enum", native_enum=False),
        default=AssetStatus.ACTIVE,
        nullable=False,
    )
    brand: Mapped[str | None] = mapped_column(String(120), nullable=True)
    model_number: Mapped[str | None] = mapped_column(String(120), nullable=True)
    serial_number: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    location_in_home: Mapped[str | None] = mapped_column(String(120), nullable=True)
    purchase_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    purchase_price_minor: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    vendor_name: Mapped[str | None] = mapped_column(String(160), nullable=True)
    expected_lifespan_months: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    household: Mapped[Household] = relationship("Household", back_populates="assets")
    appliance_detail: Mapped[Appliance | None] = relationship(
        "Appliance",
        back_populates="asset",
        uselist=False,
        cascade="all, delete-orphan",
    )
    vehicle_detail: Mapped[Vehicle | None] = relationship(
        "Vehicle",
        back_populates="asset",
        uselist=False,
        cascade="all, delete-orphan",
    )
    documents: Mapped[list[Document]] = relationship(
        "Document",
        back_populates="asset",
    )
    expenses: Mapped[list[Expense]] = relationship(
        "Expense",
        back_populates="asset",
    )
    maintenance_records: Mapped[list[MaintenanceRecord]] = relationship(
        "MaintenanceRecord",
        back_populates="asset",
        cascade="all, delete-orphan",
    )
    warranties: Mapped[list[Warranty]] = relationship(
        "Warranty",
        back_populates="asset",
        cascade="all, delete-orphan",
    )
    insurance_policies: Mapped[list[InsurancePolicy]] = relationship(
        "InsurancePolicy",
        back_populates="asset",
    )
    reminders: Mapped[list[Reminder]] = relationship(
        "Reminder",
        back_populates="asset",
        cascade="all, delete-orphan",
    )


# =============================================================================
# 5. appliances (1-to-1 Specialization of Asset)
# =============================================================================
class Appliance(HouseholdTenantMixin, Base):
    __tablename__ = "appliances"
    __table_args__ = (
        UniqueConstraint("asset_id", name="uq_appliances_asset_id"),
        CheckConstraint(
            "energy_star_rating IS NULL OR (energy_star_rating >= 1 AND energy_star_rating <= 5)",
            name="valid_energy_star_rating",
        ),
        CheckConstraint(
            "rated_wattage IS NULL OR rated_wattage > 0",
            name="positive_rated_wattage",
        ),
        Index("ix_appliances_household_type", "household_id", "appliance_type"),
    )

    asset_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("assets.id", ondelete="CASCADE"),
        nullable=False,
    )
    appliance_type: Mapped[ApplianceType] = mapped_column(
        Enum(ApplianceType, name="appliance_type_enum", native_enum=False),
        nullable=False,
    )
    energy_star_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rated_wattage: Mapped[int | None] = mapped_column(Integer, nullable=True)
    service_interval_days: Mapped[int] = mapped_column(Integer, default=180, nullable=False)
    last_serviced_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    next_service_due_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    smart_integration_id: Mapped[str | None] = mapped_column(String(120), nullable=True)

    # Relationships
    asset: Mapped[Asset] = relationship("Asset", back_populates="appliance_detail")


# =============================================================================
# 6. vehicles (1-to-1 Specialization of Asset)
# =============================================================================
class Vehicle(HouseholdTenantMixin, Base):
    __tablename__ = "vehicles"
    __table_args__ = (
        UniqueConstraint("asset_id", name="uq_vehicles_asset_id"),
        UniqueConstraint(
            "household_id",
            "registration_number",
            name="uq_vehicles_household_reg_number",
        ),
        CheckConstraint("odometer_km >= 0", name="non_negative_odometer_km"),
        CheckConstraint("service_interval_km > 0", name="positive_service_interval_km"),
        Index("ix_vehicles_household_type", "household_id", "vehicle_type"),
    )

    asset_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("assets.id", ondelete="CASCADE"),
        nullable=False,
    )
    vehicle_type: Mapped[VehicleType] = mapped_column(
        Enum(VehicleType, name="vehicle_type_enum", native_enum=False),
        nullable=False,
    )
    registration_number: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    vin_chassis_number: Mapped[str | None] = mapped_column(String(64), nullable=True)
    engine_or_motor_number: Mapped[str | None] = mapped_column(String(64), nullable=True)
    fuel_type: Mapped[FuelType] = mapped_column(
        Enum(FuelType, name="fuel_type_enum", native_enum=False),
        nullable=False,
    )
    manufacturing_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    odometer_km: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    service_interval_km: Mapped[int] = mapped_column(Integer, default=10000, nullable=False)
    last_service_odometer_km: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    pollution_cert_expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    registration_valid_until: Mapped[date | None] = mapped_column(Date, nullable=True)

    # Relationships
    asset: Mapped[Asset] = relationship("Asset", back_populates="vehicle_detail")


# =============================================================================
# 7. inventory_items (Pantry, Cleaning & Household Stock Tracking)
# =============================================================================
class InventoryItem(HouseholdTenantMixin, Base):
    __tablename__ = "inventory_items"
    __table_args__ = (
        CheckConstraint("quantity_on_hand >= 0", name="non_negative_inventory_qty"),
        CheckConstraint("reorder_threshold >= 0", name="non_negative_reorder_threshold"),
        Index("ix_inventory_items_household_status", "household_id", "stock_status"),
        Index("ix_inventory_items_household_expiry", "household_id", "expiry_date"),
    )

    name: Mapped[str] = mapped_column(String(160), nullable=False)
    sku_or_barcode: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    category: Mapped[GroceryCategory] = mapped_column(
        Enum(GroceryCategory, name="grocery_category_enum", native_enum=False),
        default=GroceryCategory.OTHER,
        nullable=False,
    )
    storage_location: Mapped[StorageLocation] = mapped_column(
        Enum(StorageLocation, name="storage_location_enum", native_enum=False),
        default=StorageLocation.PANTRY,
        nullable=False,
    )
    quantity_on_hand: Mapped[Decimal] = mapped_column(
        Numeric(12, 3),
        default=Decimal("0.000"),
        nullable=False,
    )
    unit: Mapped[MeasurementUnit] = mapped_column(
        Enum(MeasurementUnit, name="measurement_unit_enum", native_enum=False),
        default=MeasurementUnit.PIECE,
        nullable=False,
    )
    reorder_threshold: Mapped[Decimal] = mapped_column(
        Numeric(12, 3),
        default=Decimal("1.000"),
        nullable=False,
    )
    stock_status: Mapped[StockStatus] = mapped_column(
        Enum(StockStatus, name="stock_status_enum", native_enum=False),
        default=StockStatus.IN_STOCK,
        nullable=False,
    )
    expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    last_restocked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    household: Mapped[Household] = relationship("Household", back_populates="inventory_items")
    grocery_replenishments: Mapped[list[GroceryItem]] = relationship(
        "GroceryItem",
        back_populates="linked_inventory_item",
    )


# =============================================================================
# 8. grocery_items (Active Shopping & Replenishment List Items)
# =============================================================================
class GroceryItem(HouseholdTenantMixin, Base):
    __tablename__ = "grocery_items"
    __table_args__ = (
        CheckConstraint("planned_quantity > 0", name="positive_planned_grocery_qty"),
        CheckConstraint("estimated_unit_price_minor >= 0", name="non_negative_est_grocery_price"),
        Index("ix_grocery_items_household_purchased", "household_id", "is_purchased"),
    )

    inventory_item_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("inventory_items.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    category: Mapped[GroceryCategory] = mapped_column(
        Enum(GroceryCategory, name="grocery_category_enum", native_enum=False),
        default=GroceryCategory.PRODUCE,
        nullable=False,
    )
    planned_quantity: Mapped[Decimal] = mapped_column(
        Numeric(12, 3),
        default=Decimal("1.000"),
        nullable=False,
    )
    unit: Mapped[MeasurementUnit] = mapped_column(
        Enum(MeasurementUnit, name="measurement_unit_enum", native_enum=False),
        default=MeasurementUnit.PIECE,
        nullable=False,
    )
    estimated_unit_price_minor: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    preferred_store: Mapped[str | None] = mapped_column(String(120), nullable=True)
    is_purchased: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    purchased_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    added_reason: Mapped[str | None] = mapped_column(
        String(160),
        nullable=True,
        doc="e.g., Low stock trigger, Weekly meal plan, Manual entry.",
    )

    # Relationships
    household: Mapped[Household] = relationship("Household", back_populates="grocery_items")
    linked_inventory_item: Mapped[InventoryItem | None] = relationship(
        "InventoryItem",
        back_populates="grocery_replenishments",
    )


# =============================================================================
# 9. clothing_items (Wardrobe & Laundry Care Registry)
# =============================================================================
class ClothingItem(HouseholdTenantMixin, Base):
    __tablename__ = "clothing_items"
    __table_args__ = (
        CheckConstraint("max_wash_temp_celsius > 0", name="positive_wash_temp"),
        CheckConstraint("wear_count_since_wash >= 0", name="non_negative_wear_count"),
        Index("ix_clothing_items_household_status", "household_id", "laundry_status"),
    )

    owner_member_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("household_members.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    category: Mapped[GarmentCategory] = mapped_column(
        Enum(GarmentCategory, name="garment_category_enum", native_enum=False),
        nullable=False,
    )
    fabric_composition: Mapped[str] = mapped_column(String(120), nullable=False)
    color_group: Mapped[str] = mapped_column(String(64), nullable=False)
    wash_care_method: Mapped[WashCareMethod] = mapped_column(
        Enum(WashCareMethod, name="wash_care_method_enum", native_enum=False),
        default=WashCareMethod.MACHINE_WASH_COLD,
        nullable=False,
    )
    max_wash_temp_celsius: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    can_tumble_dry: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    requires_ironing: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    laundry_status: Mapped[LaundryStatus] = mapped_column(
        Enum(LaundryStatus, name="laundry_status_enum", native_enum=False),
        default=LaundryStatus.CLEAN_IN_WARDROBE,
        nullable=False,
    )
    wear_count_since_wash: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_washed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    household: Mapped[Household] = relationship("Household", back_populates="clothing_items")
    owner_member: Mapped[HouseholdMember | None] = relationship(
        "HouseholdMember",
        back_populates="clothing_items",
    )


# =============================================================================
# 10. documents (Household Document Vault, OCR Text & Vector Metadata)
# =============================================================================
class Document(HouseholdTenantMixin, Base):
    """
    Stores metadata, cryptographic hash, extracted text, and optional asset
    association for receipts, bills, manuals, warranties, and insurance PDFs.
    """

    __tablename__ = "documents"
    __table_args__ = (
        CheckConstraint("file_size_bytes >= 0", name="non_negative_doc_file_size"),
        UniqueConstraint("household_id", "sha256_checksum", name="uq_documents_household_sha256"),
        Index("ix_documents_household_type", "household_id", "document_type"),
        Index("ix_documents_household_asset", "household_id", "asset_id"),
    )

    asset_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("assets.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    document_type: Mapped[DocumentType] = mapped_column(
        Enum(DocumentType, name="document_type_enum", native_enum=False),
        nullable=False,
    )
    gcs_uri: Mapped[str] = mapped_column(String(512), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), default="application/pdf", nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    sha256_checksum: Mapped[str] = mapped_column(String(64), nullable=False)
    extracted_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    structured_metadata_json: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    embedding_model: Mapped[str | None] = mapped_column(String(80), nullable=True)
    is_indexed_for_rag: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    document_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)

    # Relationships
    household: Mapped[Household] = relationship("Household", back_populates="documents")
    asset: Mapped[Asset | None] = relationship("Asset", back_populates="documents")
    warranties: Mapped[list[Warranty]] = relationship("Warranty", back_populates="document")
    insurance_policies: Mapped[list[InsurancePolicy]] = relationship(
        "InsurancePolicy",
        back_populates="document",
    )


# =============================================================================
# 11. warranties (Asset Warranty & AMC Coverage Registry)
# =============================================================================
class Warranty(HouseholdTenantMixin, Base):
    __tablename__ = "warranties"
    __table_args__ = (
        CheckConstraint("end_date >= start_date", name="warranty_end_after_start"),
        CheckConstraint("coverage_limit_minor >= 0", name="non_negative_warranty_limit"),
        Index("ix_warranties_household_status_end", "household_id", "status", "end_date"),
    )

    asset_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("assets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    document_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("documents.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    warranty_type: Mapped[WarrantyType] = mapped_column(
        Enum(WarrantyType, name="warranty_type_enum", native_enum=False),
        default=WarrantyType.MANUFACTURER_STANDARD,
        nullable=False,
    )
    provider_name: Mapped[str] = mapped_column(String(160), nullable=False)
    contract_or_policy_number: Mapped[str | None] = mapped_column(String(120), nullable=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    coverage_limit_minor: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    covers_parts: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    covers_labor: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    support_contact_phone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    support_contact_email: Mapped[str | None] = mapped_column(String(160), nullable=True)
    status: Mapped[WarrantyStatus] = mapped_column(
        Enum(WarrantyStatus, name="warranty_status_enum", native_enum=False),
        default=WarrantyStatus.ACTIVE,
        nullable=False,
    )
    terms_summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    household: Mapped[Household] = relationship("Household", back_populates="warranties")
    asset: Mapped[Asset] = relationship("Asset", back_populates="warranties")
    document: Mapped[Document | None] = relationship("Document", back_populates="warranties")
    maintenance_records: Mapped[list[MaintenanceRecord]] = relationship(
        "MaintenanceRecord",
        back_populates="warranty",
    )


# =============================================================================
# 12. insurance_policies (Motor, Home Structure, Appliance & Family Policies)
# =============================================================================
class InsurancePolicy(HouseholdTenantMixin, Base):
    __tablename__ = "insurance_policies"
    __table_args__ = (
        CheckConstraint("end_date >= start_date", name="insurance_end_after_start"),
        CheckConstraint("sum_insured_minor > 0", name="positive_sum_insured"),
        CheckConstraint("premium_amount_minor >= 0", name="non_negative_insurance_premium"),
        UniqueConstraint(
            "household_id",
            "policy_number",
            name="uq_insurance_policies_household_policy_number",
        ),
        Index("ix_insurance_policies_household_renewal", "household_id", "end_date"),
    )

    asset_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("assets.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        doc="Linked asset for motor/appliance insurance; NULL for whole-home or family health.",
    )
    document_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("documents.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    insurance_type: Mapped[InsuranceType] = mapped_column(
        Enum(InsuranceType, name="insurance_type_enum", native_enum=False),
        nullable=False,
    )
    insurer_name: Mapped[str] = mapped_column(String(160), nullable=False)
    policy_number: Mapped[str] = mapped_column(String(120), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    sum_insured_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    premium_amount_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    deductible_minor: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    billing_cycle: Mapped[BillingCycle] = mapped_column(
        Enum(BillingCycle, name="billing_cycle_enum", native_enum=False),
        default=BillingCycle.ANNUAL,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    tpa_or_claim_helpline: Mapped[str | None] = mapped_column(String(80), nullable=True)

    # Relationships
    household: Mapped[Household] = relationship("Household", back_populates="insurance_policies")
    asset: Mapped[Asset | None] = relationship("Asset", back_populates="insurance_policies")
    document: Mapped[Document | None] = relationship(
        "Document",
        back_populates="insurance_policies",
    )


# =============================================================================
# 13. maintenance_records (Preventive Service, Repairs & Work Orders on Assets)
# =============================================================================
class MaintenanceRecord(HouseholdTenantMixin, Base):
    __tablename__ = "maintenance_records"
    __table_args__ = (
        CheckConstraint("labor_cost_minor >= 0", name="non_negative_labor_cost"),
        CheckConstraint("parts_cost_minor >= 0", name="non_negative_parts_cost"),
        Index(
            "ix_maintenance_records_household_asset_date",
            "household_id",
            "asset_id",
            "service_date",
        ),
    )

    asset_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("assets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    warranty_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("warranties.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    invoice_document_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("documents.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    maintenance_type: Mapped[MaintenanceType] = mapped_column(
        Enum(MaintenanceType, name="maintenance_type_enum", native_enum=False),
        nullable=False,
    )
    status: Mapped[MaintenanceStatus] = mapped_column(
        Enum(MaintenanceStatus, name="maintenance_status_enum", native_enum=False),
        default=MaintenanceStatus.SCHEDULED,
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    service_date: Mapped[date] = mapped_column(Date, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    technician_or_vendor: Mapped[str | None] = mapped_column(String(160), nullable=True)
    odometer_reading_km: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        doc="Recorded odometer reading when the serviced asset is a vehicle.",
    )
    labor_cost_minor: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    parts_cost_minor: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    covered_under_warranty: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    next_recommended_service_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # Relationships
    household: Mapped[Household] = relationship("Household", back_populates="maintenance_records")
    asset: Mapped[Asset] = relationship("Asset", back_populates="maintenance_records")
    warranty: Mapped[Warranty | None] = relationship(
        "Warranty",
        back_populates="maintenance_records",
    )
    expenses: Mapped[list[Expense]] = relationship(
        "Expense",
        back_populates="maintenance_record",
    )


# =============================================================================
# 14. bills (Utility & Recurring Statutory Bills)
# =============================================================================
class Bill(HouseholdTenantMixin, Base):
    __tablename__ = "bills"
    __table_args__ = (
        CheckConstraint("amount_due_minor >= 0", name="non_negative_bill_amount"),
        CheckConstraint(
            "billing_period_end IS NULL OR billing_period_start IS NULL "
            "OR billing_period_end >= billing_period_start",
            name="bill_period_end_after_start",
        ),
        Index("ix_bills_household_status_due", "household_id", "status", "due_date"),
    )

    document_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("documents.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    category: Mapped[BillCategory] = mapped_column(
        Enum(BillCategory, name="bill_category_enum", native_enum=False),
        nullable=False,
    )
    provider_name: Mapped[str] = mapped_column(String(160), nullable=False)
    consumer_account_number: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    invoice_number: Mapped[str | None] = mapped_column(String(80), nullable=True)
    billing_period_start: Mapped[date | None] = mapped_column(Date, nullable=True)
    billing_period_end: Mapped[date | None] = mapped_column(Date, nullable=True)
    due_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    amount_due_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    units_consumed: Mapped[Decimal | None] = mapped_column(
        Numeric(12, 3),
        nullable=True,
        doc="Deterministic meter reading delta (e.g., kWh, cubic meters).",
    )
    unit_measure: Mapped[str | None] = mapped_column(String(32), nullable=True)
    status: Mapped[BillStatus] = mapped_column(
        Enum(BillStatus, name="bill_status_enum", native_enum=False),
        default=BillStatus.PENDING_PAYMENT,
        nullable=False,
    )
    autopay_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    household: Mapped[Household] = relationship("Household", back_populates="bills")
    expenses: Mapped[list[Expense]] = relationship("Expense", back_populates="bill")


# =============================================================================
# 15. subscriptions (Digital, Domestic Help, Milk/Newspaper & AMC Subscriptions)
# =============================================================================
class Subscription(HouseholdTenantMixin, Base):
    __tablename__ = "subscriptions"
    __table_args__ = (
        CheckConstraint("recurring_amount_minor >= 0", name="non_negative_subscription_amount"),
        Index("ix_subscriptions_household_status_renewal", "household_id", "status", "next_renewal_date"),
    )

    name: Mapped[str] = mapped_column(String(160), nullable=False)
    provider_name: Mapped[str] = mapped_column(String(160), nullable=False)
    billing_cycle: Mapped[BillingCycle] = mapped_column(
        Enum(BillingCycle, name="billing_cycle_enum", native_enum=False),
        default=BillingCycle.MONTHLY,
        nullable=False,
    )
    recurring_amount_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    currency_code: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    next_renewal_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    status: Mapped[SubscriptionStatus] = mapped_column(
        Enum(SubscriptionStatus, name="subscription_status_enum", native_enum=False),
        default=SubscriptionStatus.ACTIVE,
        nullable=False,
    )
    auto_renew: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    payment_method: Mapped[PaymentMethod] = mapped_column(
        Enum(PaymentMethod, name="payment_method_enum", native_enum=False),
        default=PaymentMethod.UPI,
        nullable=False,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    household: Mapped[Household] = relationship("Household", back_populates="subscriptions")
    expenses: Mapped[list[Expense]] = relationship("Expense", back_populates="subscription")


# =============================================================================
# 16. expenses (Household Financial Ledger Associated with Assets/Bills/Repairs)
# =============================================================================
class Expense(HouseholdTenantMixin, Base):
    """
    Deterministic financial transaction record.
    Can be associated with an Asset (TCO tracking), a Bill, a Subscription,
    a MaintenanceRecord, and a Receipt Document.
    """

    __tablename__ = "expenses"
    __table_args__ = (
        CheckConstraint("amount_minor > 0", name="positive_expense_amount"),
        Index("ix_expenses_household_date_cat", "household_id", "incurred_on", "category"),
        Index("ix_expenses_household_asset", "household_id", "asset_id"),
    )

    asset_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("assets.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    bill_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("bills.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    subscription_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("subscriptions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    maintenance_record_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("maintenance_records.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    receipt_document_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("documents.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    paid_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    category: Mapped[ExpenseCategory] = mapped_column(
        Enum(ExpenseCategory, name="expense_category_enum", native_enum=False),
        nullable=False,
    )
    amount_minor: Mapped[int] = mapped_column(BigInteger, nullable=False)
    currency_code: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    merchant_name: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    incurred_on: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    payment_method: Mapped[PaymentMethod] = mapped_column(
        Enum(PaymentMethod, name="payment_method_enum", native_enum=False),
        default=PaymentMethod.UPI,
        nullable=False,
    )
    reference_transaction_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    is_reconciled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    household: Mapped[Household] = relationship("Household", back_populates="expenses")
    asset: Mapped[Asset | None] = relationship("Asset", back_populates="expenses")
    bill: Mapped[Bill | None] = relationship("Bill", back_populates="expenses")
    subscription: Mapped[Subscription | None] = relationship(
        "Subscription",
        back_populates="expenses",
    )
    maintenance_record: Mapped[MaintenanceRecord | None] = relationship(
        "MaintenanceRecord",
        back_populates="expenses",
    )


# =============================================================================
# 17. reminders (Scheduled Household Tasks, Renewals & Due Triggers)
# =============================================================================
class Reminder(HouseholdTenantMixin, Base):
    __tablename__ = "reminders"
    __table_args__ = (
        Index("ix_reminders_household_status_due", "household_id", "status", "due_at"),
    )

    assigned_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    asset_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("assets.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    bill_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("bills.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    warranty_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("warranties.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    domain: Mapped[str] = mapped_column(String(64), nullable=False)
    priority: Mapped[ReminderPriority] = mapped_column(
        Enum(ReminderPriority, name="reminder_priority_enum", native_enum=False),
        default=ReminderPriority.MEDIUM,
        nullable=False,
    )
    status: Mapped[ReminderStatus] = mapped_column(
        Enum(ReminderStatus, name="reminder_status_enum", native_enum=False),
        default=ReminderStatus.PENDING,
        nullable=False,
    )
    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    recurrence_cron: Mapped[str | None] = mapped_column(String(64), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    household: Mapped[Household] = relationship("Household", back_populates="reminders")
    asset: Mapped[Asset | None] = relationship("Asset", back_populates="reminders")


# =============================================================================
# 18. agent_runs (LangGraph Orchestration Audit, Tool Trace & Approval Gate)
# =============================================================================
class AgentRun(HouseholdTenantMixin, Base):
    __tablename__ = "agent_runs"
    __table_args__ = (
        CheckConstraint("prompt_tokens >= 0", name="non_negative_prompt_tokens"),
        CheckConstraint("completion_tokens >= 0", name="non_negative_completion_tokens"),
        Index("ix_agent_runs_household_status", "household_id", "status"),
    )

    initiated_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    approved_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    thread_id: Mapped[str] = mapped_column(String(120), index=True, nullable=False)
    target_domain: Mapped[str] = mapped_column(String(80), nullable=False)
    user_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    final_response: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[AgentRunStatus] = mapped_column(
        Enum(AgentRunStatus, name="agent_run_status_enum", native_enum=False),
        default=AgentRunStatus.RUNNING,
        nullable=False,
    )
    highest_risk_level: Mapped[ActionRiskLevel] = mapped_column(
        Enum(ActionRiskLevel, name="action_risk_level_enum", native_enum=False),
        default=ActionRiskLevel.READ_ONLY,
        nullable=False,
    )
    requires_human_approval: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    pending_action_payload_json: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    tool_calls_json: Mapped[list[dict[str, Any]] | None] = mapped_column(JSON, nullable=True)
    grounded_citations_json: Mapped[list[dict[str, Any]] | None] = mapped_column(JSON, nullable=True)
    model_name: Mapped[str] = mapped_column(String(80), default="gemini-2.5-pro", nullable=False)
    prompt_tokens: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    completion_tokens: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    latency_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    household: Mapped[Household] = relationship("Household", back_populates="agent_runs")


# =============================================================================
# 19. events (Immutable Domain & Audit Event Bus Log)
# =============================================================================
class Event(HouseholdTenantMixin, Base):
    __tablename__ = "events"
    __table_args__ = (
        Index("ix_events_household_domain_created", "household_id", "domain", "created_at"),
    )

    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    asset_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("assets.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    agent_run_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("agent_runs.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    event_type: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    domain: Mapped[str] = mapped_column(String(64), nullable=False)
    severity: Mapped[EventSeverity] = mapped_column(
        Enum(EventSeverity, name="event_severity_enum", native_enum=False),
        default=EventSeverity.INFO,
        nullable=False,
    )
    summary: Mapped[str] = mapped_column(String(255), nullable=False)
    payload_json: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    # Relationships
    household: Mapped[Household] = relationship("Household", back_populates="events")


# =============================================================================
# 20. notifications (Multi-Channel User Alerts & Approval Prompts)
# =============================================================================
class Notification(HouseholdTenantMixin, Base):
    __tablename__ = "notifications"
    __table_args__ = (
        Index(
            "ix_notifications_recipient_status_created",
            "recipient_user_id",
            "status",
            "created_at",
        ),
    )

    recipient_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    reminder_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("reminders.id", ondelete="SET NULL"),
        nullable=True,
    )
    agent_run_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("agent_runs.id", ondelete="SET NULL"),
        nullable=True,
    )
    event_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("events.id", ondelete="SET NULL"),
        nullable=True,
    )
    channel: Mapped[NotificationChannel] = mapped_column(
        Enum(NotificationChannel, name="notification_channel_enum", native_enum=False),
        default=NotificationChannel.IN_APP,
        nullable=False,
    )
    status: Mapped[NotificationStatus] = mapped_column(
        Enum(NotificationStatus, name="notification_status_enum", native_enum=False),
        default=NotificationStatus.UNREAD,
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    action_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    household: Mapped[Household] = relationship("Household", back_populates="notifications")
    recipient_user: Mapped[User] = relationship(
        "User",
        back_populates="notifications",
        foreign_keys=[recipient_user_id],
    )
