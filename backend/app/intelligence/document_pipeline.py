"""
HomeIQ — Gemini Document Intelligence Pipeline.

Workflow:
 1. Upload document -> Object Storage / Local Development Storage (`DocumentStorageAdapter`)
 2. Persist initial Document metadata in PostgreSQL (`documents` table) with SHA-256 idempotency
 3. Analyze document with Gemini (`GeminiDocumentAnalyzer` returning structured JSON schema)
 4. Validate structured extraction against deterministic Pydantic rules & confidence floor
 5. Apply controlled, schema-mapped updates to PostgreSQL domain tables (never raw LLM writes)
 6. Emit immutable processing `Event` (`document.intelligence.completed` or `failed`)
"""
from __future__ import annotations

import asyncio
import hashlib
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Protocol

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import DocumentProcessingError
from app.core.logging import get_logger
from app.core.observability import (
    DOCUMENT_DUPLICATES_TOTAL,
    DOCUMENT_PROCESSING_DURATION,
    DOCUMENT_VALIDATION_FAILURES_TOTAL,
    DOCUMENTS_PROCESSED_TOTAL,
    GEMINI_FAILURES_TOTAL,
    GEMINI_RETRIES_TOTAL,
    record_gemini_usage,
    trace_operation,
)
from app.db.enums import (
    BillCategory,
    BillStatus,
    DocumentType,
    EventSeverity,
    ExpenseCategory,
    InsuranceType,
    MaintenanceStatus,
    MaintenanceType,
    PaymentMethod,
    WarrantyStatus,
    WarrantyType,
)
from app.db.models import (
    Bill,
    Document,
    Event,
    Expense,
    InsurancePolicy,
    MaintenanceRecord,
    Warranty,
)
from app.repositories.household_repositories import RepositoryRegistry
from app.schemas.document_extraction import (
    DocumentPipelineResult,
    DocumentProcessingStatus,
    GeminiDocumentAnalysisEnvelope,
    SourceDocumentReference,
    SupportedExtractionCategory,
)

logger = get_logger("document_intelligence_pipeline")

# Map extraction categories to database DocumentType enum
CATEGORY_TO_DOCUMENT_TYPE: dict[SupportedExtractionCategory, DocumentType] = {
    SupportedExtractionCategory.INVOICE: DocumentType.INVOICE_RECEIPT,
    SupportedExtractionCategory.RECEIPT: DocumentType.INVOICE_RECEIPT,
    SupportedExtractionCategory.UTILITY_BILL: DocumentType.UTILITY_BILL,
    SupportedExtractionCategory.WARRANTY_DOCUMENT: DocumentType.WARRANTY_CERTIFICATE,
    SupportedExtractionCategory.INSURANCE_DOCUMENT: DocumentType.INSURANCE_POLICY,
    SupportedExtractionCategory.SERVICE_INVOICE: DocumentType.INVOICE_RECEIPT,
}


class DocumentStorageAdapter:
    """
    Stores uploaded document bytes in a deterministic local object store directory
    (or mounted volume in production) with SHA-256 content addressing.
    """

    def __init__(self, local_root: str | None = None) -> None:
        self.local_root = Path(local_root or settings.DOCUMENT_STORAGE_DIR)
        self.local_root.mkdir(parents=True, exist_ok=True)

    async def store_document(
        self,
        *,
        household_id: uuid.UUID,
        filename: str,
        content_bytes: bytes,
        mime_type: str,
    ) -> tuple[str, str, int]:
        """Returns (storage_uri, sha256_checksum, file_size_bytes)."""
        if not content_bytes:
            raise DocumentProcessingError(
                "Uploaded document payload is empty.",
                retryable=False,
                stage="upload",
            )
        sha256_hex = hashlib.sha256(content_bytes).hexdigest()
        safe_name = Path(filename).name.replace(" ", "_")
        rel_key = f"{household_id}/{sha256_hex[:12]}_{safe_name}"

        target_path = self.local_root / rel_key
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.write_bytes(content_bytes)

        storage_uri = f"file://{target_path.resolve()}"
        return storage_uri, sha256_hex, len(content_bytes)


class GeminiDocumentAnalyzer(Protocol):
    """Protocol enabling real Gemini API analysis in production and deterministic mocks in tests."""

    async def analyze_document(
        self,
        *,
        content_bytes: bytes,
        mime_type: str,
        filename: str,
        expected_category: SupportedExtractionCategory | None = None,
    ) -> GeminiDocumentAnalysisEnvelope:
        ...


class GoogleGenAIDocumentAnalyzer:
    """
    Production Gemini Document Analyzer using the official `google-genai` SDK.
    Instructs Gemini to extract ONLY facts explicitly present in the document
    and constrains output to `GeminiDocumentAnalysisEnvelope`.
    When `GEMINI_API_KEY` is blank in local/offline environments, delegates to
    `DeterministicEvaluationGeminiAnalyzer` so document ingestion remains functional.
    """

    SYSTEM_INSTRUCTION = (
        "You are the HomeIQ Document Intelligence Engine. "
        "Extract ONLY factual fields explicitly stated in the provided household document. "
        "NEVER guess, extrapolate, or fabricate missing dates, policy numbers, or amounts. "
        "If an optional field is not present in the document, leave it null. "
        "Convert all monetary amounts to integer minor currency units (paise/cents, e.g. ₹4,180.00 -> 418000). "
        "Provide verbatim evidence quotes and calibrated confidence scores (0.0 to 1.0) for key fields."
    )

    async def analyze_document(
        self,
        *,
        content_bytes: bytes,
        mime_type: str,
        filename: str,
        expected_category: SupportedExtractionCategory | None = None,
    ) -> GeminiDocumentAnalysisEnvelope:
        if not settings.GEMINI_API_KEY:
            from app.evaluation.runner import DeterministicEvaluationGeminiAnalyzer

            fallback = DeterministicEvaluationGeminiAnalyzer()
            return await fallback.analyze_document(
                content_bytes=content_bytes,
                mime_type=mime_type,
                filename=filename,
                expected_category=expected_category,
            )

        from google import genai
        from google.genai import types

        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        category_hint = (
            f"Expected document category hint: {expected_category.value}."
            if expected_category
            else "Classify the document into one of the 6 supported household categories."
        )

        prompt = (
            f"Analyze document '{filename}' ({mime_type}). {category_hint} "
            "Populate only the sub-schema matching `detected_category`."
        )

        t0 = time.perf_counter()
        try:
            with trace_operation(
                "gemini.generate_content",
                attributes={"model": settings.GEMINI_FLASH_MODEL, "mime_type": mime_type},
            ):
                response = await asyncio.wait_for(
                    asyncio.to_thread(
                        client.models.generate_content,
                        model=settings.GEMINI_FLASH_MODEL,
                        contents=[
                            types.Part.from_bytes(data=content_bytes, mime_type=mime_type),
                            prompt,
                        ],
                        config=types.GenerateContentConfig(
                            system_instruction=self.SYSTEM_INSTRUCTION,
                            temperature=0.0,
                            response_mime_type="application/json",
                            response_schema=GeminiDocumentAnalysisEnvelope,
                        ),
                    ),
                    timeout=15.0,
                )
        except asyncio.TimeoutError as exc:
            GEMINI_FAILURES_TOTAL.labels(
                model=settings.GEMINI_FLASH_MODEL, error_type="timeout"
            ).inc()
            raise DocumentProcessingError(
                "Gemini API call timed out after 15.0 seconds.",
                retryable=True,
                stage="gemini_analysis",
            ) from exc
        except Exception as exc:
            GEMINI_FAILURES_TOTAL.labels(
                model=settings.GEMINI_FLASH_MODEL, error_type=type(exc).__name__
            ).inc()
            err_lower = str(exc).lower()
            if "429" in err_lower or "resource_exhausted" in err_lower or "quota" in err_lower:
                raise DocumentProcessingError(
                    f"Gemini API quota/rate limit exceeded (429 RESOURCE_EXHAUSTED): {exc}",
                    retryable=True,
                    stage="gemini_rate_limit",
                ) from exc
            raise

        if not response.text:
            GEMINI_FAILURES_TOTAL.labels(
                model=settings.GEMINI_FLASH_MODEL, error_type="empty_response"
            ).inc()
            raise DocumentProcessingError(
                "Gemini returned an empty response payload.",
                retryable=True,
                stage="gemini_analysis",
            )

        record_gemini_usage(
            model=settings.GEMINI_FLASH_MODEL,
            operation="document_extraction",
            duration_seconds=time.perf_counter() - t0,
            prompt_tokens=max(120, len(content_bytes) // 8),
            completion_tokens=max(60, len(response.text) // 4),
        )
        return GeminiDocumentAnalysisEnvelope.model_validate_json(response.text)


class DocumentIntelligencePipeline:
    """
    End-to-end idempotent document ingestion, Gemini extraction, validation,
    controlled relational persistence, and audit event pipeline.
    """

    def __init__(
        self,
        session: AsyncSession,
        analyzer: GeminiDocumentAnalyzer | None = None,
        storage: DocumentStorageAdapter | None = None,
        *,
        max_retries: int = 3,
        min_confidence_threshold: float = 0.70,
    ) -> None:
        self.session = session
        self.repos = RepositoryRegistry(session)
        self.analyzer = analyzer or GoogleGenAIDocumentAnalyzer()
        self.storage = storage or DocumentStorageAdapter()
        self.max_retries = max_retries
        self.min_confidence_threshold = min_confidence_threshold

    async def process_document(
        self,
        *,
        household_id: uuid.UUID,
        uploaded_by_user_id: uuid.UUID,
        filename: str,
        content_bytes: bytes,
        mime_type: str = "application/pdf",
        asset_id: uuid.UUID | None = None,
        expected_category: SupportedExtractionCategory | None = None,
        force_reprocess: bool = False,
    ) -> DocumentPipelineResult:
        pipeline_t0 = time.perf_counter()
        # 1. Store raw document & compute SHA-256 checksum
        storage_uri, sha256_checksum, file_size = await self.storage.store_document(
            household_id=household_id,
            filename=filename,
            content_bytes=content_bytes,
            mime_type=mime_type,
        )

        # 2. Check idempotency via (household_id, sha256_checksum)
        existing_doc = await self.repos.documents.get_by_sha256(household_id, sha256_checksum)
        if (
            existing_doc
            and not force_reprocess
            and existing_doc.structured_metadata_json
            and existing_doc.structured_metadata_json.get("processing_status")
            == DocumentProcessingStatus.DB_UPDATED.value
        ):
            meta = existing_doc.structured_metadata_json
            DOCUMENT_DUPLICATES_TOTAL.inc()
            DOCUMENTS_PROCESSED_TOTAL.labels(
                category=str(meta.get("detected_category", "UNKNOWN")),
                status="IDEMPOTENT_SKIP",
            ).inc()
            DOCUMENT_PROCESSING_DURATION.labels(
                category=str(meta.get("detected_category", "UNKNOWN")),
                status="IDEMPOTENT_SKIP",
            ).observe(time.perf_counter() - pipeline_t0)
            event = await self._emit_processing_event(
                household_id=household_id,
                user_id=uploaded_by_user_id,
                asset_id=existing_doc.asset_id,
                event_type="document.intelligence.idempotent_hit",
                severity=EventSeverity.INFO,
                summary=f"Idempotent hit for already-processed document '{existing_doc.title}'.",
                payload={"document_id": str(existing_doc.id), "sha256": sha256_checksum},
            )
            return DocumentPipelineResult(
                document_id=existing_doc.id,
                idempotency_hit=True,
                processing_status=DocumentProcessingStatus.DB_UPDATED,
                detected_category=SupportedExtractionCategory(meta["detected_category"]),
                overall_confidence=float(meta["overall_confidence"]),
                field_confidences=meta.get("field_confidences", []),
                source_reference=SourceDocumentReference(
                    document_id=existing_doc.id,
                    household_id=household_id,
                    asset_id=existing_doc.asset_id,
                    sha256_checksum=sha256_checksum,
                    storage_uri=existing_doc.gcs_uri,
                    mime_type=existing_doc.mime_type,
                ),
                extracted_payload=meta.get("extracted_payload", {}),
                created_domain_records=meta.get("created_domain_records", []),
                processing_event_id=event.id,
                attempt_count=int(meta.get("attempt_count", 1)),
                processed_at=existing_doc.updated_at,
            )

        # Create or reset Document metadata row in PostgreSQL
        if existing_doc is None:
            doc_record = Document(
                household_id=household_id,
                asset_id=asset_id,
                title=filename,
                document_type=(
                    CATEGORY_TO_DOCUMENT_TYPE[expected_category]
                    if expected_category
                    else DocumentType.OTHER
                ),
                gcs_uri=storage_uri,
                mime_type=mime_type,
                file_size_bytes=file_size,
                sha256_checksum=sha256_checksum,
                structured_metadata_json={
                    "processing_status": DocumentProcessingStatus.ANALYZING.value
                },
                created_by_id=uploaded_by_user_id,
            )
            doc_record = await self.repos.documents.create(doc_record)
        else:
            doc_record = existing_doc

        # 3. Execute Gemini analysis with bounded retry handling
        attempt = 0
        last_error: Exception | None = None
        envelope: GeminiDocumentAnalysisEnvelope | None = None

        while attempt < self.max_retries:
            attempt += 1
            try:
                envelope = await self.analyzer.analyze_document(
                    content_bytes=content_bytes,
                    mime_type=mime_type,
                    filename=filename,
                    expected_category=expected_category,
                )
                break
            except DocumentProcessingError as exc:
                last_error = exc
                if not exc.retryable or attempt >= self.max_retries:
                    break
                GEMINI_RETRIES_TOTAL.labels(
                    model=settings.GEMINI_FLASH_MODEL, reason=exc.stage
                ).inc()
                await asyncio.sleep(0.05 * (2 ** (attempt - 1)))
            except Exception as exc:
                last_error = exc
                if attempt >= self.max_retries:
                    break
                GEMINI_RETRIES_TOTAL.labels(
                    model=settings.GEMINI_FLASH_MODEL, reason=type(exc).__name__
                ).inc()
                await asyncio.sleep(0.05 * (2 ** (attempt - 1)))

        if envelope is None:
            cat_label = expected_category.value if expected_category else "UNKNOWN"
            DOCUMENTS_PROCESSED_TOTAL.labels(category=cat_label, status="FAILED").inc()
            DOCUMENT_PROCESSING_DURATION.labels(category=cat_label, status="FAILED").observe(
                time.perf_counter() - pipeline_t0
            )
            await self._mark_document_failed(
                doc_record=doc_record,
                user_id=uploaded_by_user_id,
                stage="gemini_analysis",
                reason=str(last_error),
                attempt_count=attempt,
            )
            if isinstance(last_error, DocumentProcessingError):
                raise last_error
            raise DocumentProcessingError(
                f"Document analysis failed after {attempt} attempts: {last_error}",
                retryable=False,
                stage="gemini_analysis",
                details={"document_id": str(doc_record.id), "attempts": attempt},
            )

        # 4. Deterministic Validation of Extracted Envelope
        try:
            extracted_payload = self._validate_envelope(envelope)
        except DocumentProcessingError as exc:
            cat_val = envelope.detected_category.value
            DOCUMENT_VALIDATION_FAILURES_TOTAL.labels(
                category=cat_val, reason=exc.stage
            ).inc()
            DOCUMENTS_PROCESSED_TOTAL.labels(category=cat_val, status="FAILED").inc()
            DOCUMENT_PROCESSING_DURATION.labels(category=cat_val, status="FAILED").observe(
                time.perf_counter() - pipeline_t0
            )
            await self._mark_document_failed(
                doc_record=doc_record,
                user_id=uploaded_by_user_id,
                stage="validation",
                reason=exc.message,
                attempt_count=attempt,
            )
            raise

        # 5. Controlled Database Updates (Whitelisted Schema Mapping Only)
        created_records = await self._apply_controlled_domain_updates(
            doc_record=doc_record,
            envelope=envelope,
            user_id=uploaded_by_user_id,
        )
        DOCUMENTS_PROCESSED_TOTAL.labels(
            category=envelope.detected_category.value, status="DB_UPDATED"
        ).inc()
        DOCUMENT_PROCESSING_DURATION.labels(
            category=envelope.detected_category.value, status="DB_UPDATED"
        ).observe(time.perf_counter() - pipeline_t0)

        # Update Document record with final structured metadata
        doc_type = CATEGORY_TO_DOCUMENT_TYPE[envelope.detected_category]
        metadata_snapshot: dict[str, Any] = {
            "processing_status": DocumentProcessingStatus.DB_UPDATED.value,
            "detected_category": envelope.detected_category.value,
            "overall_confidence": envelope.overall_confidence,
            "field_confidences": [fc.model_dump() for fc in envelope.field_confidences],
            "extracted_payload": extracted_payload,
            "created_domain_records": created_records,
            "attempt_count": attempt,
        }
        await self.repos.documents.update_fields(
            doc_record,
            {
                "document_type": doc_type,
                "extracted_text": envelope.extracted_text_summary,
                "structured_metadata_json": metadata_snapshot,
                "is_indexed_for_rag": True,
            },
            updated_by_id=uploaded_by_user_id,
        )

        # 6. Emit Processing Event
        event = await self._emit_processing_event(
            household_id=household_id,
            user_id=uploaded_by_user_id,
            asset_id=doc_record.asset_id,
            event_type="document.intelligence.completed",
            severity=EventSeverity.INFO,
            summary=(
                f"Extracted {envelope.detected_category.value} from '{filename}' "
                f"(confidence={envelope.overall_confidence:.2f})"
            ),
            payload={
                "document_id": str(doc_record.id),
                "category": envelope.detected_category.value,
                "confidence": envelope.overall_confidence,
                "created_domain_records": created_records,
            },
        )

        return DocumentPipelineResult(
            document_id=doc_record.id,
            idempotency_hit=False,
            processing_status=DocumentProcessingStatus.DB_UPDATED,
            detected_category=envelope.detected_category,
            overall_confidence=envelope.overall_confidence,
            field_confidences=envelope.field_confidences,
            source_reference=SourceDocumentReference(
                document_id=doc_record.id,
                household_id=household_id,
                asset_id=doc_record.asset_id,
                sha256_checksum=sha256_checksum,
                storage_uri=storage_uri,
                mime_type=mime_type,
            ),
            extracted_payload=extracted_payload,
            created_domain_records=created_records,
            processing_event_id=event.id,
            attempt_count=attempt,
            processed_at=datetime.now(timezone.utc),
        )

    def _validate_envelope(self, envelope: GeminiDocumentAnalysisEnvelope) -> dict[str, Any]:
        """
        Enforces confidence threshold and ensures the exact typed sub-schema
        corresponding to `detected_category` is populated.
        """
        if envelope.overall_confidence < self.min_confidence_threshold:
            raise DocumentProcessingError(
                f"Extraction confidence {envelope.overall_confidence:.2f} is below "
                f"minimum threshold {self.min_confidence_threshold:.2f}.",
                retryable=False,
                stage="validation",
                details={"overall_confidence": envelope.overall_confidence},
            )

        category_map: dict[SupportedExtractionCategory, Any] = {
            SupportedExtractionCategory.INVOICE: envelope.invoice_data,
            SupportedExtractionCategory.RECEIPT: envelope.receipt_data,
            SupportedExtractionCategory.UTILITY_BILL: envelope.utility_bill_data,
            SupportedExtractionCategory.WARRANTY_DOCUMENT: envelope.warranty_data,
            SupportedExtractionCategory.INSURANCE_DOCUMENT: envelope.insurance_data,
            SupportedExtractionCategory.SERVICE_INVOICE: envelope.service_invoice_data,
        }
        sub_schema = category_map.get(envelope.detected_category)
        if sub_schema is None:
            raise DocumentProcessingError(
                f"Gemini classified document as {envelope.detected_category.value} "
                "but omitted the corresponding structured payload.",
                retryable=False,
                stage="validation",
            )

        # Deterministic line-item sum cross-check for Invoices and Receipts
        if envelope.detected_category in {
            SupportedExtractionCategory.INVOICE,
            SupportedExtractionCategory.RECEIPT,
        }:
            line_items = getattr(sub_schema, "line_items", [])
            if line_items:
                computed_items_sum = sum(item.line_total_minor for item in line_items)
                tax_minor = getattr(sub_schema, "tax_amount_minor", 0) or 0
                if computed_items_sum + tax_minor > sub_schema.total_amount_minor * 2:
                    raise DocumentProcessingError(
                        "Line item totals grossly exceed extracted invoice total.",
                        retryable=False,
                        stage="validation",
                    )

        return sub_schema.model_dump(mode="json")

    async def _apply_controlled_domain_updates(
        self,
        *,
        doc_record: Document,
        envelope: GeminiDocumentAnalysisEnvelope,
        user_id: uuid.UUID,
    ) -> list[dict[str, str]]:
        """
        Maps validated Pydantic schemas to strongly-typed SQLAlchemy entities.
        Never allows arbitrary LLM keys to be written to database tables.
        """
        created: list[dict[str, str]] = []
        cat = envelope.detected_category

        if cat == SupportedExtractionCategory.INVOICE and envelope.invoice_data:
            inv = envelope.invoice_data
            expense = Expense(
                household_id=doc_record.household_id,
                asset_id=doc_record.asset_id,
                receipt_document_id=doc_record.id,
                paid_by_user_id=user_id,
                category=(
                    ExpenseCategory.ASSET_PURCHASE
                    if doc_record.asset_id
                    else ExpenseCategory.OTHER
                ),
                amount_minor=inv.total_amount_minor,
                currency_code=inv.currency_code,
                merchant_name=inv.vendor_name,
                description=f"Invoice #{inv.invoice_number}",
                incurred_on=inv.invoice_date,
                payment_method=PaymentMethod.UPI,
                reference_transaction_id=inv.invoice_number,
                created_by_id=user_id,
            )
            await self.repos.expenses.create(expense)
            created.append({"table": "expenses", "id": str(expense.id)})

        elif cat == SupportedExtractionCategory.RECEIPT and envelope.receipt_data:
            rcpt = envelope.receipt_data
            expense = Expense(
                household_id=doc_record.household_id,
                asset_id=doc_record.asset_id,
                receipt_document_id=doc_record.id,
                paid_by_user_id=user_id,
                category=ExpenseCategory.GROCERIES,
                amount_minor=rcpt.total_amount_minor,
                currency_code=rcpt.currency_code,
                merchant_name=rcpt.merchant_name,
                description=f"Receipt {rcpt.receipt_number or 'POS'}",
                incurred_on=rcpt.transaction_date,
                payment_method=PaymentMethod.UPI,
                created_by_id=user_id,
            )
            await self.repos.expenses.create(expense)
            created.append({"table": "expenses", "id": str(expense.id)})

        elif cat == SupportedExtractionCategory.UTILITY_BILL and envelope.utility_bill_data:
            ub = envelope.utility_bill_data
            bill_cat = (
                BillCategory[ub.utility_type]
                if ub.utility_type in BillCategory.__members__
                else BillCategory.ELECTRICITY
            )
            bill = Bill(
                household_id=doc_record.household_id,
                document_id=doc_record.id,
                category=bill_cat,
                provider_name=ub.provider_name,
                consumer_account_number=ub.consumer_account_number,
                invoice_number=ub.invoice_number,
                billing_period_start=ub.billing_period_start,
                billing_period_end=ub.billing_period_end,
                due_date=ub.due_date,
                amount_due_minor=ub.amount_due_minor,
                units_consumed=ub.units_consumed,
                unit_measure=ub.unit_measure,
                status=BillStatus.PENDING_PAYMENT,
                created_by_id=user_id,
            )
            await self.repos.bills.create(bill)
            created.append({"table": "bills", "id": str(bill.id)})

        elif cat == SupportedExtractionCategory.WARRANTY_DOCUMENT and envelope.warranty_data:
            wd = envelope.warranty_data
            if doc_record.asset_id is None:
                raise DocumentProcessingError(
                    "Warranty extraction requires an associated household asset_id.",
                    retryable=False,
                    stage="database_update",
                )
            warranty = Warranty(
                household_id=doc_record.household_id,
                asset_id=doc_record.asset_id,
                document_id=doc_record.id,
                warranty_type=WarrantyType.MANUFACTURER_STANDARD,
                provider_name=wd.provider_name,
                contract_or_policy_number=wd.contract_or_policy_number,
                start_date=wd.start_date,
                end_date=wd.end_date,
                coverage_limit_minor=wd.coverage_limit_minor or 0,
                covers_parts=wd.covers_parts,
                covers_labor=wd.covers_labor,
                support_contact_phone=wd.support_contact_phone,
                support_contact_email=wd.support_contact_email,
                status=WarrantyStatus.ACTIVE,
                terms_summary=wd.terms_summary,
                created_by_id=user_id,
            )
            await self.repos.warranties.create(warranty)
            created.append({"table": "warranties", "id": str(warranty.id)})

        elif cat == SupportedExtractionCategory.INSURANCE_DOCUMENT and envelope.insurance_data:
            ins = envelope.insurance_data
            ins_type = (
                InsuranceType[ins.insurance_type]
                if ins.insurance_type in InsuranceType.__members__
                else InsuranceType.HOME_STRUCTURE_CONTENT
            )
            policy = InsurancePolicy(
                household_id=doc_record.household_id,
                asset_id=doc_record.asset_id,
                document_id=doc_record.id,
                insurance_type=ins_type,
                insurer_name=ins.insurer_name,
                policy_number=ins.policy_number,
                start_date=ins.start_date,
                end_date=ins.end_date,
                sum_insured_minor=ins.sum_insured_minor,
                premium_amount_minor=ins.premium_amount_minor,
                deductible_minor=ins.deductible_minor,
                tpa_or_claim_helpline=ins.tpa_or_claim_helpline,
                created_by_id=user_id,
            )
            await self.repos.insurance.create(policy)
            created.append({"table": "insurance_policies", "id": str(policy.id)})

        elif cat == SupportedExtractionCategory.SERVICE_INVOICE and envelope.service_invoice_data:
            srv = envelope.service_invoice_data
            if doc_record.asset_id is None:
                raise DocumentProcessingError(
                    "Service invoice extraction requires an associated household asset_id.",
                    retryable=False,
                    stage="database_update",
                )
            m_type = (
                MaintenanceType[srv.maintenance_type]
                if srv.maintenance_type in MaintenanceType.__members__
                else MaintenanceType.PREVENTIVE_SERVICE
            )
            maint = MaintenanceRecord(
                household_id=doc_record.household_id,
                asset_id=doc_record.asset_id,
                invoice_document_id=doc_record.id,
                maintenance_type=m_type,
                status=MaintenanceStatus.COMPLETED,
                title=f"{srv.serviced_asset_name} — {srv.service_center_or_vendor}",
                description=srv.work_summary,
                service_date=srv.service_date,
                technician_or_vendor=srv.service_center_or_vendor,
                odometer_reading_km=srv.odometer_reading_km,
                labor_cost_minor=srv.labor_cost_minor,
                parts_cost_minor=srv.parts_cost_minor,
                covered_under_warranty=srv.covered_under_warranty,
                next_recommended_service_date=srv.next_recommended_service_date,
                created_by_id=user_id,
            )
            await self.repos.maintenance.create(maint)
            created.append({"table": "maintenance_records", "id": str(maint.id)})

            if srv.total_cost_minor > 0 and not srv.covered_under_warranty:
                expense = Expense(
                    household_id=doc_record.household_id,
                    asset_id=doc_record.asset_id,
                    maintenance_record_id=maint.id,
                    receipt_document_id=doc_record.id,
                    paid_by_user_id=user_id,
                    category=ExpenseCategory.HOME_MAINTENANCE,
                    amount_minor=srv.total_cost_minor,
                    currency_code="INR",
                    merchant_name=srv.service_center_or_vendor,
                    description=srv.work_summary,
                    incurred_on=srv.service_date,
                    created_by_id=user_id,
                )
                await self.repos.expenses.create(expense)
                created.append({"table": "expenses", "id": str(expense.id)})

        return created

    async def _mark_document_failed(
        self,
        *,
        doc_record: Document,
        user_id: uuid.UUID,
        stage: str,
        reason: str,
        attempt_count: int,
    ) -> None:
        await self.repos.documents.update_fields(
            doc_record,
            {
                "structured_metadata_json": {
                    "processing_status": DocumentProcessingStatus.FAILED.value,
                    "failed_stage": stage,
                    "failure_reason": reason,
                    "attempt_count": attempt_count,
                }
            },
            updated_by_id=user_id,
        )
        await self._emit_processing_event(
            household_id=doc_record.household_id,
            user_id=user_id,
            asset_id=doc_record.asset_id,
            event_type="document.intelligence.failed",
            severity=EventSeverity.WARNING,
            summary=f"Document intelligence failed at stage '{stage}': {reason}",
            payload={
                "document_id": str(doc_record.id),
                "stage": stage,
                "reason": reason,
                "attempts": attempt_count,
            },
        )

    async def _emit_processing_event(
        self,
        *,
        household_id: uuid.UUID,
        user_id: uuid.UUID,
        asset_id: uuid.UUID | None,
        event_type: str,
        severity: EventSeverity,
        summary: str,
        payload: dict[str, Any],
    ) -> Event:
        event = Event(
            household_id=household_id,
            actor_user_id=user_id,
            asset_id=asset_id,
            event_type=event_type,
            domain="documents_warranty",
            severity=severity,
            summary=summary,
            payload_json=payload,
            created_by_id=user_id,
        )
        return await self.repos.events.create(event)
