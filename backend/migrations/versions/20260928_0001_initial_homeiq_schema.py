"""Initial HomeIQ 20-table normalized household & asset schema

Revision ID: 20260928_0001
Revises: None
Create Date: 2026-09-28 00:00:00.000000

Explicitly creates all 20 normalized domain tables in dependency order
without relying on `Base.metadata.create_all`:
 1. users
 2. households
 3. household_members
 4. assets
 5. appliances
 6. vehicles
 7. documents
 8. grocery_items
 9. inventory_items
10. clothing_items
11. bills
12. maintenance_records
13. expenses
14. subscriptions
15. warranties
16. insurance_policies
17. reminders
18. events
19. agent_runs
20. notifications
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260928_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # 1. users
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=160), nullable=False),
        sa.Column("phone_number", sa.String(length=32), nullable=True),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_users"),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )
    op.create_index("ix_users_email_active", "users", ["email", "is_active"])

    # 2. households
    op.create_table(
        "households",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("slug", sa.String(length=100), nullable=False),
        sa.Column("currency_code", sa.String(length=3), nullable=False, server_default="INR"),
        sa.Column("timezone", sa.String(length=64), nullable=False, server_default="Asia/Kolkata"),
        sa.Column("monthly_budget_minor", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("address_line", sa.String(length=255), nullable=True),
        sa.Column("city", sa.String(length=100), nullable=True),
        sa.Column("country_code", sa.String(length=2), nullable=False, server_default="IN"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("monthly_budget_minor >= 0", name="ck_households_non_negative_monthly_budget"),
        sa.PrimaryKeyConstraint("id", name="pk_households"),
        sa.UniqueConstraint("slug", name="uq_households_slug"),
    )

    # 3. household_members
    op.create_table(
        "household_members",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("household_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False, server_default="ADULT_MEMBER"),
        sa.Column("nickname", sa.String(length=80), nullable=True),
        sa.Column("is_primary_contact", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("joined_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["household_id"], ["households.id"], ondelete="CASCADE", name="fk_household_members_household_id_households"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE", name="fk_household_members_user_id_users"),
        sa.PrimaryKeyConstraint("id", name="pk_household_members"),
        sa.UniqueConstraint("household_id", "user_id", name="uq_household_member_user"),
    )
    op.create_index("ix_household_members_user_role", "household_members", ["user_id", "role"])

    # 4. assets
    op.create_table(
        "assets",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("household_id", sa.Uuid(), nullable=False),
        sa.Column("asset_tag", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=180), nullable=False),
        sa.Column("category", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="OPERATIONAL"),
        sa.Column("brand", sa.String(length=100), nullable=True),
        sa.Column("model_number", sa.String(length=120), nullable=True),
        sa.Column("serial_number", sa.String(length=120), nullable=True),
        sa.Column("location_room", sa.String(length=100), nullable=True),
        sa.Column("purchase_date", sa.Date(), nullable=True),
        sa.Column("purchase_price_minor", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("expected_lifespan_months", sa.Integer(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("purchase_price_minor >= 0", name="ck_assets_non_negative_asset_purchase_price"),
        sa.ForeignKeyConstraint(["household_id"], ["households.id"], ondelete="CASCADE", name="fk_assets_household_id_households"),
        sa.PrimaryKeyConstraint("id", name="pk_assets"),
        sa.UniqueConstraint("household_id", "asset_tag", name="uq_assets_household_asset_tag"),
    )
    op.create_index("ix_assets_household_category_status", "assets", ["household_id", "category", "status"])

    # 5. appliances
    op.create_table(
        "appliances",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("household_id", sa.Uuid(), nullable=False),
        sa.Column("asset_id", sa.Uuid(), nullable=False),
        sa.Column("appliance_type", sa.String(length=32), nullable=False),
        sa.Column("power_rating_watts", sa.Integer(), nullable=True),
        sa.Column("energy_star_rating", sa.Integer(), nullable=True),
        sa.Column("maintenance_interval_days", sa.Integer(), nullable=False, server_default="180"),
        sa.Column("last_serviced_on", sa.Date(), nullable=True),
        sa.Column("next_service_due_on", sa.Date(), nullable=True),
        sa.Column("filter_model", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "energy_star_rating IS NULL OR (energy_star_rating >= 1 AND energy_star_rating <= 5)",
            name="ck_appliances_valid_energy_star_rating",
        ),
        sa.CheckConstraint("maintenance_interval_days > 0", name="ck_appliances_positive_maintenance_interval"),
        sa.ForeignKeyConstraint(["household_id"], ["households.id"], ondelete="CASCADE", name="fk_appliances_household_id_households"),
        sa.ForeignKeyConstraint(["asset_id"], ["assets.id"], ondelete="CASCADE", name="fk_appliances_asset_id_assets"),
        sa.PrimaryKeyConstraint("id", name="pk_appliances"),
        sa.UniqueConstraint("asset_id", name="uq_appliances_asset_id"),
    )
    op.create_index("ix_appliances_household_next_service", "appliances", ["household_id", "next_service_due_on"])

    # 6. vehicles
    op.create_table(
        "vehicles",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("household_id", sa.Uuid(), nullable=False),
        sa.Column("asset_id", sa.Uuid(), nullable=False),
        sa.Column("registration_number", sa.String(length=32), nullable=False),
        sa.Column("vin", sa.String(length=32), nullable=True),
        sa.Column("fuel_type", sa.String(length=32), nullable=False),
        sa.Column("odometer_km", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("service_interval_km", sa.Integer(), nullable=False, server_default="10000"),
        sa.Column("service_interval_months", sa.Integer(), nullable=False, server_default="12"),
        sa.Column("last_service_odometer_km", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("next_service_due_km", sa.Integer(), nullable=False, server_default="10000"),
        sa.Column("next_service_due_on", sa.Date(), nullable=True),
        sa.Column("pollution_cert_expiry", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("odometer_km >= 0", name="ck_vehicles_non_negative_odometer"),
        sa.CheckConstraint("service_interval_km > 0", name="ck_vehicles_positive_service_interval_km"),
        sa.ForeignKeyConstraint(["household_id"], ["households.id"], ondelete="CASCADE", name="fk_vehicles_household_id_households"),
        sa.ForeignKeyConstraint(["asset_id"], ["assets.id"], ondelete="CASCADE", name="fk_vehicles_asset_id_assets"),
        sa.PrimaryKeyConstraint("id", name="pk_vehicles"),
        sa.UniqueConstraint("asset_id", name="uq_vehicles_asset_id"),
        sa.UniqueConstraint("household_id", "registration_number", name="uq_vehicles_household_reg_num"),
    )

    # 7. documents
    op.create_table(
        "documents",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("household_id", sa.Uuid(), nullable=False),
        sa.Column("asset_id", sa.Uuid(), nullable=True),
        sa.Column("uploaded_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("title", sa.String(length=220), nullable=False),
        sa.Column("document_type", sa.String(length=32), nullable=False),
        sa.Column("storage_uri", sa.String(length=512), nullable=False),
        sa.Column("mime_type", sa.String(length=100), nullable=False, server_default="application/pdf"),
        sa.Column("file_size_bytes", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("sha256_checksum", sa.String(length=64), nullable=False),
        sa.Column("document_date", sa.Date(), nullable=True),
        sa.Column("extracted_text_summary", sa.Text(), nullable=True),
        sa.Column("structured_extraction_json", sa.JSON(), nullable=False),
        sa.Column("is_verified_by_human", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("file_size_bytes >= 0", name="ck_documents_non_negative_document_size"),
        sa.ForeignKeyConstraint(["household_id"], ["households.id"], ondelete="CASCADE", name="fk_documents_household_id_households"),
        sa.ForeignKeyConstraint(["asset_id"], ["assets.id"], ondelete="SET NULL", name="fk_documents_asset_id_assets"),
        sa.ForeignKeyConstraint(["uploaded_by_user_id"], ["users.id"], ondelete="SET NULL", name="fk_documents_uploaded_by_user_id_users"),
        sa.PrimaryKeyConstraint("id", name="pk_documents"),
        sa.UniqueConstraint("household_id", "sha256_checksum", name="uq_documents_household_sha256"),
    )
    op.create_index("ix_documents_household_type_date", "documents", ["household_id", "document_type", "document_date"])

    # 8. grocery_items
    op.create_table(
        "grocery_items",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("household_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("category", sa.String(length=32), nullable=False),
        sa.Column("preferred_brand", sa.String(length=100), nullable=True),
        sa.Column("default_unit", sa.String(length=32), nullable=False, server_default="PIECE"),
        sa.Column("Target_quantity", sa.Numeric(10, 3), nullable=False, server_default="1.000"),
        sa.Column("estimated_unit_price_minor", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("is_needed_on_shopping_list", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_staple", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("notes", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint('"Target_quantity" > 0', name="ck_grocery_items_positive_grocery_target_qty"),
        sa.CheckConstraint("estimated_unit_price_minor >= 0", name="ck_grocery_items_non_negative_grocery_unit_price"),
        sa.ForeignKeyConstraint(["household_id"], ["households.id"], ondelete="CASCADE", name="fk_grocery_items_household_id_households"),
        sa.PrimaryKeyConstraint("id", name="pk_grocery_items"),
    )
    op.create_index("ix_grocery_items_household_shopping", "grocery_items", ["household_id", "is_needed_on_shopping_list", "category"])

    # 9. inventory_items
    op.create_table(
        "inventory_items",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("household_id", sa.Uuid(), nullable=False),
        sa.Column("grocery_item_id", sa.Uuid(), nullable=True),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("category", sa.String(length=32), nullable=False),
        sa.Column("storage_location", sa.String(length=32), nullable=False, server_default="PANTRY"),
        sa.Column("quantity_on_hand", sa.Numeric(10, 3), nullable=False, server_default="0.000"),
        sa.Column("unit", sa.String(length=32), nullable=False, server_default="PIECE"),
        sa.Column("reorder_threshold", sa.Numeric(10, 3), nullable=False, server_default="1.000"),
        sa.Column("stock_status", sa.String(length=32), nullable=False, server_default="IN_STOCK"),
        sa.Column("batch_or_lot", sa.String(length=64), nullable=True),
        sa.Column("purchased_on", sa.Date(), nullable=True),
        sa.Column("expiry_date", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("quantity_on_hand >= 0", name="ck_inventory_items_non_negative_inventory_qty"),
        sa.CheckConstraint("reorder_threshold >= 0", name="ck_inventory_items_non_negative_reorder_threshold"),
        sa.ForeignKeyConstraint(["household_id"], ["households.id"], ondelete="CASCADE", name="fk_inventory_items_household_id_households"),
        sa.ForeignKeyConstraint(["grocery_item_id"], ["grocery_items.id"], ondelete="SET NULL", name="fk_inventory_items_grocery_item_id_grocery_items"),
        sa.PrimaryKeyConstraint("id", name="pk_inventory_items"),
    )
    op.create_index("ix_inventory_items_household_status_expiry", "inventory_items", ["household_id", "stock_status", "expiry_date"])

    # 10. clothing_items
    op.create_table(
        "clothing_items",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("household_id", sa.Uuid(), nullable=False),
        sa.Column("owner_member_id", sa.Uuid(), nullable=True),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("brand", sa.String(length=100), nullable=True),
        sa.Column("color", sa.String(length=64), nullable=False),
        sa.Column("fabric_type", sa.String(length=32), nullable=False),
        sa.Column("care_instruction", sa.String(length=32), nullable=False),
        sa.Column("max_wash_temp_c", sa.Integer(), nullable=False, server_default="40"),
        sa.Column("can_tumble_dry", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("wear_count_since_wash", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("needs_laundry", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("last_washed_on", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("wear_count_since_wash >= 0", name="ck_clothing_items_non_negative_wear_count"),
        sa.ForeignKeyConstraint(["household_id"], ["households.id"], ondelete="CASCADE", name="fk_clothing_items_household_id_households"),
        sa.ForeignKeyConstraint(["owner_member_id"], ["household_members.id"], ondelete="SET NULL", name="fk_clothing_items_owner_member_id_household_members"),
        sa.PrimaryKeyConstraint("id", name="pk_clothing_items"),
    )
    op.create_index("ix_clothing_items_household_laundry", "clothing_items", ["household_id", "needs_laundry", "care_instruction"])

    # 11. bills
    op.create_table(
        "bills",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("household_id", sa.Uuid(), nullable=False),
        sa.Column("document_id", sa.Uuid(), nullable=True),
        sa.Column("provider_name", sa.String(length=160), nullable=False),
        sa.Column("utility_type", sa.String(length=32), nullable=False),
        sa.Column("consumer_account_number", sa.String(length=80), nullable=False),
        sa.Column("billing_period_start", sa.Date(), nullable=True),
        sa.Column("billing_period_end", sa.Date(), nullable=True),
        sa.Column("due_date", sa.Date(), nullable=False),
        sa.Column("amount_due_minor", sa.BigInteger(), nullable=False),
        sa.Column("consumption_units", sa.Numeric(12, 3), nullable=True),
        sa.Column("consumption_unit_label", sa.String(length=32), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="PENDING"),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("autopay_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("amount_due_minor >= 0", name="ck_bills_non_negative_bill_amount"),
        sa.ForeignKeyConstraint(["household_id"], ["households.id"], ondelete="CASCADE", name="fk_bills_household_id_households"),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"], ondelete="SET NULL", name="fk_bills_document_id_documents"),
        sa.PrimaryKeyConstraint("id", name="pk_bills"),
    )
    op.create_index("ix_bills_household_status_due", "bills", ["household_id", "status", "due_date"])

    # 12. maintenance_records
    op.create_table(
        "maintenance_records",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("household_id", sa.Uuid(), nullable=False),
        sa.Column("asset_id", sa.Uuid(), nullable=False),
        sa.Column("document_id", sa.Uuid(), nullable=True),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("priority", sa.String(length=32), nullable=False, server_default="MEDIUM"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="SCHEDULED"),
        sa.Column("scheduled_for", sa.Date(), nullable=False),
        sa.Column("completed_on", sa.Date(), nullable=True),
        sa.Column("technician_or_vendor", sa.String(length=160), nullable=True),
        sa.Column("labor_cost_minor", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("parts_cost_minor", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("odometer_at_service_km", sa.Integer(), nullable=True),
        sa.Column("next_recommended_service_on", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("labor_cost_minor >= 0", name="ck_maintenance_records_non_negative_labor_cost"),
        sa.CheckConstraint("parts_cost_minor >= 0", name="ck_maintenance_records_non_negative_parts_cost"),
        sa.ForeignKeyConstraint(["household_id"], ["households.id"], ondelete="CASCADE", name="fk_maintenance_records_household_id_households"),
        sa.ForeignKeyConstraint(["asset_id"], ["assets.id"], ondelete="CASCADE", name="fk_maintenance_records_asset_id_assets"),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"], ondelete="SET NULL", name="fk_maintenance_records_document_id_documents"),
        sa.PrimaryKeyConstraint("id", name="pk_maintenance_records"),
    )
    op.create_index("ix_maintenance_household_asset_status", "maintenance_records", ["household_id", "asset_id", "status", "scheduled_for"])

    # 13. expenses
    op.create_table(
        "expenses",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("household_id", sa.Uuid(), nullable=False),
        sa.Column("paid_by_member_id", sa.Uuid(), nullable=True),
        sa.Column("asset_id", sa.Uuid(), nullable=True),
        sa.Column("bill_id", sa.Uuid(), nullable=True),
        sa.Column("maintenance_record_id", sa.Uuid(), nullable=True),
        sa.Column("receipt_document_id", sa.Uuid(), nullable=True),
        sa.Column("category", sa.String(length=32), nullable=False),
        sa.Column("merchant_name", sa.String(length=160), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=False),
        sa.Column("amount_minor", sa.BigInteger(), nullable=False),
        sa.Column("currency_code", sa.String(length=3), nullable=False, server_default="INR"),
        sa.Column("incurred_on", sa.Date(), nullable=False),
        sa.Column("payment_method", sa.String(length=64), nullable=False, server_default="UPI"),
        sa.Column("is_recurring", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("amount_minor > 0", name="ck_expenses_positive_expense_amount"),
        sa.ForeignKeyConstraint(["household_id"], ["households.id"], ondelete="CASCADE", name="fk_expenses_household_id_households"),
        sa.ForeignKeyConstraint(["paid_by_member_id"], ["household_members.id"], ondelete="SET NULL", name="fk_expenses_paid_by_member_id_household_members"),
        sa.ForeignKeyConstraint(["asset_id"], ["assets.id"], ondelete="SET NULL", name="fk_expenses_asset_id_assets"),
        sa.ForeignKeyConstraint(["bill_id"], ["bills.id"], ondelete="SET NULL", name="fk_expenses_bill_id_bills"),
        sa.ForeignKeyConstraint(["maintenance_record_id"], ["maintenance_records.id"], ondelete="SET NULL", name="fk_expenses_maintenance_record_id_maintenance_records"),
        sa.ForeignKeyConstraint(["receipt_document_id"], ["documents.id"], ondelete="SET NULL", name="fk_expenses_receipt_document_id_documents"),
        sa.PrimaryKeyConstraint("id", name="pk_expenses"),
    )
    op.create_index("ix_expenses_household_date_category", "expenses", ["household_id", "incurred_on", "category"])
    op.create_index("ix_expenses_household_asset", "expenses", ["household_id", "asset_id"])

    # 14. subscriptions
    op.create_table(
        "subscriptions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("household_id", sa.Uuid(), nullable=False),
        sa.Column("asset_id", sa.Uuid(), nullable=True),
        sa.Column("service_name", sa.String(length=160), nullable=False),
        sa.Column("vendor_name", sa.String(length=160), nullable=False),
        sa.Column("billing_cycle", sa.String(length=32), nullable=False, server_default="MONTHLY"),
        sa.Column("amount_minor", sa.BigInteger(), nullable=False),
        sa.Column("next_renewal_date", sa.Date(), nullable=False),
        sa.Column("auto_renew", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("amount_minor >= 0", name="ck_subscriptions_non_negative_subscription_amount"),
        sa.ForeignKeyConstraint(["household_id"], ["households.id"], ondelete="CASCADE", name="fk_subscriptions_household_id_households"),
        sa.ForeignKeyConstraint(["asset_id"], ["assets.id"], ondelete="SET NULL", name="fk_subscriptions_asset_id_assets"),
        sa.PrimaryKeyConstraint("id", name="pk_subscriptions"),
    )
    op.create_index("ix_subscriptions_household_renewal", "subscriptions", ["household_id", "is_active", "next_renewal_date"])

    # 15. warranties
    op.create_table(
        "warranties",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("household_id", sa.Uuid(), nullable=False),
        sa.Column("asset_id", sa.Uuid(), nullable=False),
        sa.Column("document_id", sa.Uuid(), nullable=True),
        sa.Column("warranty_type", sa.String(length=32), nullable=False),
        sa.Column("provider_name", sa.String(length=160), nullable=False),
        sa.Column("contract_Or_policy_number", sa.String(length=100), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="ACTIVE"),
        sa.Column("coverage_terms", sa.Text(), nullable=True),
        sa.Column("claim_contact_phone", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("end_date >= start_date", name="ck_warranties_warranty_end_after_start"),
        sa.ForeignKeyConstraint(["household_id"], ["households.id"], ondelete="CASCADE", name="fk_warranties_household_id_households"),
        sa.ForeignKeyConstraint(["asset_id"], ["assets.id"], ondelete="CASCADE", name="fk_warranties_asset_id_assets"),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"], ondelete="SET NULL", name="fk_warranties_document_id_documents"),
        sa.PrimaryKeyConstraint("id", name="pk_warranties"),
    )
    op.create_index("ix_warranties_household_status_end", "warranties", ["household_id", "status", "end_date"])

    # 16. insurance_policies
    op.create_table(
        "insurance_policies",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("household_id", sa.Uuid(), nullable=False),
        sa.Column("covered_asset_id", sa.Uuid(), nullable=True),
        sa.Column("document_id", sa.Uuid(), nullable=True),
        sa.Column("policy_type", sa.String(length=32), nullable=False),
        sa.Column("insurer_name", sa.String(length=160), nullable=False),
        sa.Column("policy_number", sa.String(length=100), nullable=False),
        sa.Column("Coverage_limit_minor", sa.BigInteger(), nullable=False),
        sa.Column("annual_premium_minor", sa.BigInteger(), nullable=False),
        sa.Column("deductible_minor", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("effective_from", sa.Date(), nullable=False),
        sa.Column("expires_on", sa.Date(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint('"Coverage_limit_minor" > 0', name="ck_insurance_policies_positive_coverage_limit"),
        sa.CheckConstraint("annual_premium_minor >= 0", name="ck_insurance_policies_non_negative_premium"),
        sa.CheckConstraint("expires_on >= effective_from", name="ck_insurance_policies_insurance_expiry_after_start"),
        sa.ForeignKeyConstraint(["household_id"], ["households.id"], ondelete="CASCADE", name="fk_insurance_policies_household_id_households"),
        sa.ForeignKeyConstraint(["covered_asset_id"], ["assets.id"], ondelete="SET NULL", name="fk_insurance_policies_covered_asset_id_assets"),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"], ondelete="SET NULL", name="fk_insurance_policies_document_id_documents"),
        sa.PrimaryKeyConstraint("id", name="pk_insurance_policies"),
        sa.UniqueConstraint("household_id", "policy_number", name="uq_insurance_household_policy_number"),
    )
    op.create_index("ix_insurance_household_expiry", "insurance_policies", ["household_id", "is_active", "expires_on"])

    # 17. reminders
    op.create_table(
        "reminders",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("household_id", sa.Uuid(), nullable=False),
        sa.Column("assigned_member_id", sa.Uuid(), nullable=True),
        sa.Column("asset_id", sa.Uuid(), nullable=True),
        sa.Column("bill_id", sa.Uuid(), nullable=True),
        sa.Column("maintenance_record_id", sa.Uuid(), nullable=True),
        sa.Column("warranty_id", sa.Uuid(), nullable=True),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("domain", sa.String(length=64), nullable=False),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="PENDING"),
        sa.Column("is_recurring", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("recurrence_rule", sa.String(length=120), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["household_id"], ["households.id"], ondelete="CASCADE", name="fk_reminders_household_id_households"),
        sa.ForeignKeyConstraint(["assigned_member_id"], ["household_members.id"], ondelete="SET NULL", name="fk_reminders_assigned_member_id_household_members"),
        sa.ForeignKeyConstraint(["asset_id"], ["assets.id"], ondelete="CASCADE", name="fk_reminders_asset_id_assets"),
        sa.ForeignKeyConstraint(["bill_id"], ["bills.id"], ondelete="CASCADE", name="fk_reminders_bill_id_bills"),
        sa.ForeignKeyConstraint(["maintenance_record_id"], ["maintenance_records.id"], ondelete="CASCADE", name="fk_reminders_maintenance_record_id_maintenance_records"),
        sa.ForeignKeyConstraint(["warranty_id"], ["warranties.id"], ondelete="CASCADE", name="fk_reminders_warranty_id_warranties"),
        sa.PrimaryKeyConstraint("id", name="pk_reminders"),
    )
    op.create_index("ix_reminders_household_status_due", "reminders", ["household_id", "status", "due_at"])

    # 18. events
    op.create_table(
        "events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("household_id", sa.Uuid(), nullable=False),
        sa.Column("actor_user_id", sa.Uuid(), nullable=True),
        sa.Column("asset_id", sa.Uuid(), nullable=True),
        sa.Column("event_type", sa.String(length=120), nullable=False),
        sa.Column("domain", sa.String(length=64), nullable=False),
        sa.Column("severity", sa.String(length=32), nullable=False, server_default="INFO"),
        sa.Column("correlation_id", sa.String(length=64), nullable=True),
        sa.Column("payload_json", sa.JSON(), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("processed_by_worker", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["household_id"], ["households.id"], ondelete="CASCADE", name="fk_events_household_id_households"),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"], ondelete="SET NULL", name="fk_events_actor_user_id_users"),
        sa.ForeignKeyConstraint(["asset_id"], ["assets.id"], ondelete="SET NULL", name="fk_events_asset_id_assets"),
        sa.PrimaryKeyConstraint("id", name="pk_events"),
    )
    op.create_index("ix_events_household_domain_occurred", "events", ["household_id", "domain", "occurred_at"])
    op.create_index("ix_events_unprocessed_worker", "events", ["processed_by_worker", "occurred_at"])

    # 19. agent_runs
    op.create_table(
        "agent_runs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("household_id", sa.Uuid(), nullable=False),
        sa.Column("initiated_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("approved_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("thread_id", sa.String(length=100), nullable=False),
        sa.Column("agent_name", sa.String(length=100), nullable=False),
        sa.Column("target_domain", sa.String(length=64), nullable=False),
        sa.Column("user_query", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="RUNNING"),
        sa.Column("highest_risk_level", sa.String(length=32), nullable=False, server_default="READ_ONLY"),
        sa.Column("requires_human_approval", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("proposed_tool_calls_json", sa.JSON(), nullable=False),
        sa.Column("grounded_citations_json", sa.JSON(), nullable=False),
        sa.Column("final_response", sa.Text(), nullable=True),
        sa.Column("prompt_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("completion_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("latency_ms", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("prompt_tokens >= 0 AND completion_tokens >= 0", name="ck_agent_runs_non_negative_token_counts"),
        sa.ForeignKeyConstraint(["household_id"], ["households.id"], ondelete="CASCADE", name="fk_agent_runs_household_id_households"),
        sa.ForeignKeyConstraint(["initiated_by_user_id"], ["users.id"], ondelete="SET NULL", name="fk_agent_runs_initiated_by_user_id_users"),
        sa.ForeignKeyConstraint(["approved_by_user_id"], ["users.id"], ondelete="SET NULL", name="fk_agent_runs_approved_by_user_id_users"),
        sa.PrimaryKeyConstraint("id", name="pk_agent_runs"),
    )
    op.create_index("ix_agent_runs_household_status", "agent_runs", ["household_id", "status", "requires_human_approval"])

    # 20. notifications
    op.create_table(
        "notifications",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("household_id", sa.Uuid(), nullable=False),
        sa.Column("recipient_user_id", sa.Uuid(), nullable=False),
        sa.Column("reminder_id", sa.Uuid(), nullable=True),
        sa.Column("agent_run_id", sa.Uuid(), nullable=True),
        sa.Column("channel", sa.String(length=32), nullable=False, server_default="IN_APP"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="QUEUED"),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("action_url", sa.String(length=512), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["household_id"], ["households.id"], ondelete="CASCADE", name="fk_notifications_household_id_households"),
        sa.ForeignKeyConstraint(["recipient_user_id"], ["users.id"], ondelete="CASCADE", name="fk_notifications_recipient_user_id_users"),
        sa.ForeignKeyConstraint(["reminder_id"], ["reminders.id"], ondelete="SET NULL", name="fk_notifications_reminder_id_reminders"),
        sa.ForeignKeyConstraint(["agent_run_id"], ["agent_runs.id"], ondelete="SET NULL", name="fk_notifications_agent_run_id_agent_runs"),
        sa.PrimaryKeyConstraint("id", name="pk_notifications"),
    )
    op.create_index("ix_notifications_recipient_unread", "notifications", ["recipient_user_id", "status", "created_at"])

    # 21. parent_health_records
    op.create_table(
        "parent_health_records",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("household_id", sa.Uuid(), nullable=False),
        sa.Column("document_id", sa.Uuid(), nullable=True),
        sa.Column("parent_name", sa.String(length=160), nullable=False),
        sa.Column("record_category", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("provider_or_doctor", sa.String(length=160), nullable=True),
        sa.Column("recorded_date", sa.Date(), nullable=False),
        sa.Column("next_due_or_followup_date", sa.Date(), nullable=True),
        sa.Column("schedule_or_frequency", sa.String(length=120), nullable=True),
        sa.Column("explicit_measurement_value", sa.String(length=200), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="RECORDED"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["household_id"], ["households.id"], ondelete="CASCADE", name="fk_parent_health_records_household_id_households"),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"], ondelete="SET NULL", name="fk_parent_health_records_document_id_documents"),
        sa.PrimaryKeyConstraint("id", name="pk_parent_health_records"),
    )
    op.create_index("ix_parent_health_records_household_cat_due", "parent_health_records", ["household_id", "record_category", "next_due_or_followup_date"])


def downgrade() -> None:
    for table_name in [
        "parent_health_records",
        "notifications",
        "agent_runs",
        "events",
        "reminders",
        "insurance_policies",
        "warranties",
        "subscriptions",
        "expenses",
        "maintenance_records",
        "bills",
        "clothing_items",
        "inventory_items",
        "grocery_items",
        "documents",
        "vehicles",
        "appliances",
        "assets",
        "household_members",
        "households",
        "users",
    ]:
        op.drop_table(table_name)
