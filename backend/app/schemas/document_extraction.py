"""
HomeIQ — Structured Extraction Schemas for the Gemini Document Intelligence Pipeline.

Supports the 6 initial household document categories:
 1. invoices (`INVOICE`)
 2. receipts (`RECEIPT`)
 3. utility bills (`UTILITY_BILL`)
 4. warranty documents (`WARRANTY_DOCUMENT`)
 5. insurance documents (`INSURANCE_DOCUMENT`)
 6. service invoices (`SERVICE_INVOICE`)

Design Rules:
- Extract ONLY information explicitly supported by the source document.
- Unmentioned optional fields MUST remain None rather than guessed.
- Never allow the LLM to write arbitrary database columns directly.
"""
from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
try:
    from enum import StrEnum
except ImportError:
    from enum import Enum

    class StrEnum(str, Enum):  # type: ignore[no-redef]
        pass
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator


class SupportedExtractionCategory(StrEnum):
    INVOICE = "INVOICE"
    RECEIPT = "RECEIPT"
    UTILITY_BILL = "UTILITY_BILL"
    WARRANTY_DOCUMENT = "WARRANTY_DOCUMENT"
    INSURANCE_DOCUMENT = "INSURANCE_DOCUMENT"
    SERVICE_INVOICE = "SERVICE_INVOICE"
    MEDICAL_LAB_REPORT = "MEDICAL_LAB_REPORT"
    TRAVEL_BOOKING_VOUCHER = "TRAVEL_BOOKING_VOUCHER"


class DocumentProcessingStatus(StrEnum):
    UPLOADED = "UPLOADED"
    STORED = "STORED"
    ANALYZING = "ANALYZING"
    EXTRACTED = "EXTRACTED"
    VALIDATED = "VALIDATED"
    DB_UPDATED = "DB_UPDATED"
    RETRY_SCHEDULED = "RETRY_SCHEDULED"
    FAILED = "FAILED"


class FieldConfidence(BaseModel):
    model_config = ConfigDict(extra="forbid")

    field_name: str
    confidence: float = Field(ge=0.0, le=1.0)
    evidence_quote: str | None = Field(
        default=None,
        description="Verbatim substring from the document supporting the extracted value.",
    )


class ExtractedLineItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    description: str
    quantity: Decimal = Field(default=Decimal("1.0"), gt=0)
    unit: str | None = None
    unit_price_minor: int | None = Field(default=None, ge=0)
    line_total_minor: int = Field(ge=0)


# -----------------------------------------------------------------------------
# 1. Invoice Extraction Schema (Asset / Equipment / Vendor Invoices)
# -----------------------------------------------------------------------------
class InvoiceExtractionSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    vendor_name: str
    invoice_number: str
    invoice_date: date
    due_date: date | None = None
    currency_code: str = Field(default="INR", min_length=3, max_length=3)
    subtotal_minor: int | None = Field(default=None, ge=0)
    tax_amount_minor: int | None = Field(default=None, ge=0)
    total_amount_minor: int = Field(ge=0)
    asset_brand: str | None = None
    asset_model_number: str | None = None
    asset_serial_number: str | None = None
    line_items: list[ExtractedLineItem] = Field(default_factory=list)


# -----------------------------------------------------------------------------
# 2. Receipt Extraction Schema (Grocery / Retail / Household POS Receipts)
# -----------------------------------------------------------------------------
class ReceiptExtractionSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    merchant_name: str
    receipt_number: str | None = None
    transaction_date: date
    currency_code: str = Field(default="INR", min_length=3, max_length=3)
    payment_method: str | None = None
    total_amount_minor: int = Field(ge=0)
    tax_amount_minor: int | None = Field(default=None, ge=0)
    line_items: list[ExtractedLineItem] = Field(default_factory=list)


# -----------------------------------------------------------------------------
# 3. Utility Bill Extraction Schema (Electricity, Water, Piped Gas, Broadband)
# -----------------------------------------------------------------------------
class UtilityBillExtractionSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    provider_name: str
    utility_type: str = Field(description="ELECTRICITY | WATER_SEWAGE | PIPED_GAS | BROADBAND_INTERNET")
    consumer_account_number: str
    invoice_number: str | None = None
    billing_period_start: date | None = None
    billing_period_end: date | None = None
    due_date: date
    amount_due_minor: int = Field(ge=0)
    units_consumed: Decimal | None = Field(default=None, ge=0)
    unit_measure: str | None = None

    @model_validator(mode="after")
    def check_period_order(self) -> UtilityBillExtractionSchema:
        if (
            self.billing_period_start
            and self.billing_period_end
            and self.billing_period_end < self.billing_period_start
        ):
            raise ValueError("Utility bill period end cannot precede start date.")
        return self


# -----------------------------------------------------------------------------
# 4. Warranty Document Extraction Schema
# -----------------------------------------------------------------------------
class WarrantyExtractionSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    provider_name: str
    product_name: str
    brand: str | None = None
    model_number: str | None = None
    serial_number: str | None = None
    contract_or_policy_number: str | None = None
    start_date: date
    end_date: date
    covers_parts: bool = True
    covers_labor: bool = True
    coverage_limit_minor: int | None = Field(default=None, ge=0)
    support_contact_phone: str | None = None
    support_contact_email: str | None = None
    terms_summary: str | None = None

    @model_validator(mode="after")
    def check_warranty_window(self) -> WarrantyExtractionSchema:
        if self.end_date < self.start_date:
            raise ValueError("Warranty end_date must be >= start_date.")
        return self


# -----------------------------------------------------------------------------
# 5. Insurance Document Extraction Schema
# -----------------------------------------------------------------------------
class InsuranceExtractionSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    insurer_name: str
    policy_number: str
    insurance_type: str = Field(
        description="MOTOR_COMPREHENSIVE | MOTOR_THIRD_PARTY | HOME_STRUCTURE_CONTENT | APPLIANCE_PROTECTION | HEALTH_FAMILY_FLOATER"
    )
    insured_asset_identifier: str | None = Field(
        default=None,
        description="Vehicle registration number, VIN, or appliance serial number if explicitly stated.",
    )
    start_date: date
    end_date: date
    sum_insured_minor: int = Field(gt=0)
    premium_amount_minor: int = Field(ge=0)
    deductible_minor: int = Field(default=0, ge=0)
    tpa_or_claim_helpline: str | None = None

    @model_validator(mode="after")
    def check_policy_window(self) -> InsuranceExtractionSchema:
        if self.end_date < self.start_date:
            raise ValueError("Insurance policy end_date must be >= start_date.")
        return self


# -----------------------------------------------------------------------------
# 6. Service Invoice Extraction Schema (Appliance Maintenance / Vehicle Service)
# -----------------------------------------------------------------------------
class ServiceInvoiceExtractionSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    service_center_or_vendor: str
    invoice_number: str | None = None
    service_date: date
    serviced_asset_name: str
    asset_identifier: str | None = Field(
        default=None,
        description="Vehicle registration number or appliance serial number.",
    )
    maintenance_type: str = Field(
        default="PREVENTIVE_SERVICE",
        description="PREVENTIVE_SERVICE | BREAKDOWN_REPAIR | FILTER_PART_REPLACEMENT",
    )
    work_summary: str
    odometer_reading_km: int | None = Field(default=None, ge=0)
    labor_cost_minor: int = Field(default=0, ge=0)
    parts_cost_minor: int = Field(default=0, ge=0)
    total_cost_minor: int = Field(ge=0)
    covered_under_warranty: bool = False
    next_recommended_service_date: date | None = None

    @model_validator(mode="after")
    def validate_cost_consistency(self) -> ServiceInvoiceExtractionSchema:
        component_sum = self.labor_cost_minor + self.parts_cost_minor
        if component_sum > 0 and self.total_cost_minor < component_sum:
            raise ValueError(
                f"total_cost_minor ({self.total_cost_minor}) cannot be less than labor + parts ({component_sum})."
            )
        return self


# -----------------------------------------------------------------------------
# Unified Gemini Structured Envelope & Pipeline Result
# -----------------------------------------------------------------------------
class GeminiDocumentAnalysisEnvelope(BaseModel):
    """
    Canonical output envelope returned by the Gemini Document Analyzer before
    deterministic validation and domain persistence.
    """

    model_config = ConfigDict(extra="forbid")

    detected_category: SupportedExtractionCategory
    overall_confidence: float = Field(ge=0.0, le=1.0)
    extracted_text_summary: str
    field_confidences: list[FieldConfidence] = Field(default_factory=list)
    invoice_data: InvoiceExtractionSchema | None = None
    receipt_data: ReceiptExtractionSchema | None = None
    utility_bill_data: UtilityBillExtractionSchema | None = None
    warranty_data: WarrantyExtractionSchema | None = None
    insurance_data: InsuranceExtractionSchema | None = None
    service_invoice_data: ServiceInvoiceExtractionSchema | None = None
    medical_lab_data: MedicalLabReportExtractionSchema | None = None
    travel_voucher_data: TravelBookingVoucherExtractionSchema | None = None


class MedicalLabPanelItemExtraction(BaseModel):
    model_config = ConfigDict(extra="forbid")

    biomarker: str = Field(min_length=1, max_length=120)
    value: str = Field(min_length=1, max_length=80)
    reference_range: str | None = Field(default=None, max_length=120)


class MedicalLabReportExtractionSchema(BaseModel):
    """Structured extraction schema for Parents' Health Monitoring lab reports (Domain 6)."""

    model_config = ConfigDict(extra="forbid")

    lab_or_provider_name: str = Field(min_length=2, max_length=180)
    report_number: str = Field(min_length=2, max_length=100)
    patient_or_parent_name: str = Field(min_length=2, max_length=160)
    referring_doctor: str | None = Field(default=None, max_length=160)
    report_date: date
    next_followup_date: date | None = None
    test_title: str = Field(min_length=2, max_length=200)
    explicit_measurement_summary: str = Field(min_length=2, max_length=300)
    currency_code: str = Field(default="INR", min_length=3, max_length=3)
    total_amount_minor: int = Field(default=0, ge=0)
    panel_measurements: list[MedicalLabPanelItemExtraction] = Field(default_factory=list)


class TravelBookingVoucherExtractionSchema(BaseModel):
    """Structured extraction schema for Travel & Leisure booking vouchers (Domain 7)."""

    model_config = ConfigDict(extra="forbid")

    provider_or_carrier: str = Field(min_length=2, max_length=180)
    booking_reference: str = Field(min_length=2, max_length=120)
    trip_name: str = Field(min_length=2, max_length=200)
    origin_city: str | None = Field(default=None, max_length=120)
    destination: str = Field(min_length=2, max_length=160)
    transport_mode: str = Field(default="FLIGHT", max_length=64)
    departure_date: date
    return_date: date | None = None
    accommodation_name: str | None = Field(default=None, max_length=200)
    travelers: str | None = Field(default=None, max_length=255)
    currency_code: str = Field(default="INR", min_length=3, max_length=3)
    total_amount_minor: int = Field(default=0, ge=0)
    document_status: str | None = Field(default=None, max_length=160)
    important_date_label: str | None = Field(default=None, max_length=160)



class SourceDocumentReference(BaseModel):
    document_id: uuid.UUID
    household_id: uuid.UUID
    asset_id: uuid.UUID | None
    sha256_checksum: str
    storage_uri: str
    mime_type: str


class DocumentPipelineResult(BaseModel):
    document_id: uuid.UUID
    idempotency_hit: bool = False
    processing_status: DocumentProcessingStatus
    detected_category: SupportedExtractionCategory
    overall_confidence: float
    field_confidences: list[FieldConfidence]
    source_reference: SourceDocumentReference
    extracted_payload: dict[str, Any]
    created_domain_records: list[dict[str, str]]
    processing_event_id: uuid.UUID
    attempt_count: int
    processed_at: datetime
