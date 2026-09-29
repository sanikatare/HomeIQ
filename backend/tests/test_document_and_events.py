"""
HomeIQ — Gemini Document Intelligence Pipeline, RabbitMQ Event Bus & Proactive Intelligence Tests.
"""
from __future__ import annotations

import uuid
from datetime import date

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DocumentProcessingError
from app.events.bus import HomeIQEventBus, HouseholdEventType, TypedEventEnvelope
from app.intelligence.document_pipeline import DocumentIntelligencePipeline
from app.intelligence.proactive import ProactiveIntelligenceEngine, ProactiveInsightType
from app.schemas.document_extraction import (
    FieldConfidence,
    GeminiDocumentAnalysisEnvelope,
    SupportedExtractionCategory,
    UtilityBillExtractionSchema,
)

SEEDED_HOUSEHOLD_ID = uuid.UUID("22222222-2222-4222-8222-222222222201")
SEEDED_USER_ID = uuid.UUID("11111111-1111-4111-8111-111111111101")


class MockFlakyThenSuccessGeminiAnalyzer:
    """Simulates a transient timeout on attempt 1 and structured extraction on attempt 2."""

    def __init__(self) -> None:
        self.calls = 0

    async def analyze_document(self, **kwargs):  # type: ignore[no-untyped-def]
        self.calls += 1
        if self.calls == 1:
            raise DocumentProcessingError(
                "Simulated transient Gemini rate limit", retryable=True
            )
        return GeminiDocumentAnalysisEnvelope(
            detected_category=SupportedExtractionCategory.UTILITY_BILL,
            overall_confidence=0.96,
            extracted_text_summary="MSEDCL October Bill Account 170019283746 Rs. 3,920.00",
            field_confidences=[
                FieldConfidence(
                    field_name="amount_due_minor",
                    confidence=0.98,
                    evidence_quote="Total Payable: Rs. 3,920.00",
                )
            ],
            utility_bill_data=UtilityBillExtractionSchema(
                provider_name="MSEDCL Mahavitaran",
                utility_type="ELECTRICITY",
                consumer_account_number="170019283746",
                invoice_number="MSEDCL-2026-10-1102",
                due_date=date(2026, 11, 8),
                amount_due_minor=392000,
            ),
        )


@pytest.mark.asyncio
async def test_document_pipeline_retry_and_idempotency(db_session: AsyncSession) -> None:
    analyzer = MockFlakyThenSuccessGeminiAnalyzer()
    pipeline = DocumentIntelligencePipeline(session=db_session, analyzer=analyzer)
    pdf_bytes = b"%PDF-1.7\nMSEDCL Electricity Bill Oct 2026 Rs 3920"

    # First run: recovers from attempt 1 transient error and succeeds on attempt 2
    res1 = await pipeline.process_document(
        household_id=SEEDED_HOUSEHOLD_ID,
        uploaded_by_user_id=SEEDED_USER_ID,
        filename="msedcl_oct_2026.pdf",
        content_bytes=pdf_bytes,
    )
    assert res1.idempotency_hit is False
    assert res1.attempt_count == 2
    assert res1.detected_category == SupportedExtractionCategory.UTILITY_BILL
    assert len(res1.created_domain_records) == 1
    assert res1.created_domain_records[0]["table"] == "bills"

    # Second run with identical file bytes: returns idempotent hit without calling Gemini again
    res2 = await pipeline.process_document(
        household_id=SEEDED_HOUSEHOLD_ID,
        uploaded_by_user_id=SEEDED_USER_ID,
        filename="msedcl_oct_2026_duplicate.pdf",
        content_bytes=pdf_bytes,
    )
    assert res2.idempotency_hit is True
    assert res2.document_id == res1.document_id
    assert analyzer.calls == 2  # No extra LLM call


@pytest.mark.asyncio
async def test_event_bus_idempotency_retry_and_dead_letter_queue(
    db_session: AsyncSession,
) -> None:
    bus = HomeIQEventBus()

    # 1. Transient failure on attempt 1 succeeds on attempt 2
    env_retry = TypedEventEnvelope(
        event_type=HouseholdEventType.LOW_STOCK,
        household_id=SEEDED_HOUSEHOLD_ID,
        actor_user_id=SEEDED_USER_ID,
        idempotency_key="idem-low-stock-001",
        domain="kitchen_grocery",
        payload={"simulate_transient_failure": True, "item": "Indrayani Rice"},
    )
    outcome1 = await bus.publish_and_consume(db_session, env_retry)
    assert outcome1.status == "PROCESSED"
    assert outcome1.attempts_made == 2

    # 2. Duplicate delivery with same idempotency_key is skipped
    outcome_dup = await bus.publish_and_consume(db_session, env_retry)
    assert outcome_dup.status == "IDEMPOTENT_SKIP"

    # 3. Poison message exhausts retries and routes to Dead-Letter Queue (DLQ)
    env_poison = TypedEventEnvelope(
        event_type=HouseholdEventType.LOW_STOCK,
        household_id=SEEDED_HOUSEHOLD_ID,
        actor_user_id=SEEDED_USER_ID,
        idempotency_key="idem-poison-999",
        domain="kitchen_grocery",
        payload={"simulate_poison_message": True},
    )
    outcome_dlq = await bus.publish_and_consume(db_session, env_poison)
    assert outcome_dlq.status == "DEAD_LETTERED"
    assert outcome_dlq.attempts_made == 3
    assert len(bus.dead_letter_queue) == 1


@pytest.mark.asyncio
async def test_proactive_intelligence_engine(db_session: AsyncSession) -> None:
    engine = ProactiveIntelligenceEngine(db_session)
    report = await engine.evaluate_household(
        household_id=SEEDED_HOUSEHOLD_ID,
        recipient_user_id=SEEDED_USER_ID,
        reference_date=date(2026, 9, 28),
    )
    detected_types = {ins.insight_type for ins in report.insights}
    assert ProactiveInsightType.UPCOMING_BILL in detected_types
    assert ProactiveInsightType.EXPIRING_INSURANCE in detected_types
    assert ProactiveInsightType.MAINTENANCE_DUE in detected_types
    assert ProactiveInsightType.LOW_INVENTORY in detected_types
    assert ProactiveInsightType.RECURRING_EXPENSE in detected_types
    assert ProactiveInsightType.UPCOMING_PARENT_CHECKUP in detected_types
    assert report.reminders_created > 0
    assert report.notifications_created > 0
