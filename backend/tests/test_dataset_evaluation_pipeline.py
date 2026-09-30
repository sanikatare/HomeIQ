"""
HomeIQ — Automated Tests for the Dataset & Document Evaluation Framework.

Verifies:
 1. Manifest & ground-truth schema loading across all 10 evaluation documents
 2. Public dataset schema adapters (ICDAR 2019 SROIE & NAVER Clova CORD-v2)
 3. Field-level exact vs normalized matching, date normalization, numeric tolerance,
    order-invariant line-item comparison, missing/hallucinated field rates, and
    12-category error classification (including RATE_LIMIT, OCR_ERROR, VALIDATION_ERROR)
 4. End-to-end execution of `HomeIQEvaluationRunner` over the real `DocumentIntelligencePipeline`,
    `SharedRetrievalInterface` (RAG), `HomeIQAgentOrchestrator` (7 agents), and Scenarios A–D
 5. FastAPI evaluation endpoints (`/api/v1/intelligence/evaluation/datasets` & `/run`)
"""
from __future__ import annotations

from pathlib import Path

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DocumentProcessingError
from app.evaluation.metrics import (
    classify_pipeline_exception,
    compare_field_value,
    compare_line_items,
    compute_document_metrics,
)
from app.evaluation.runner import HomeIQEvaluationRunner, PublicDatasetAdapter
from app.evaluation.schemas import EvaluationErrorCategory


def test_public_dataset_adapters_sroie_and_cord_v2() -> None:
    sroie_sample = {
        "company": "POPULAR BOOK CO. (M) SDN BHD",
        "date": "25/12/2018",
        "address": "NO 8, JALAN 7/118B, DESA TUN RAZAK",
        "total": "34.80",
    }
    gt_sroie = PublicDatasetAdapter.convert_sroie_to_homeiq_ground_truth(
        "sroie_0001", sroie_sample
    )
    assert gt_sroie.expected_category == "RECEIPT"
    assert gt_sroie.fields["merchant_name"] == "POPULAR BOOK CO. (M) SDN BHD"
    assert gt_sroie.fields["transaction_date"] == "2018-12-25"
    assert gt_sroie.fields["total_amount_minor"] == 3480

    cord_sample = {
        "gt_parse": {
            "menu": [
                {"nm": "ICE LEMON TEA", "cnt": "2", "price": "24,000"},
                {"nm": "NASI GORENG", "cnt": "1", "price": "45,000"},
            ],
            "total": {"total_price": "69,000"},
        }
    }
    gt_cord = PublicDatasetAdapter.convert_cord_v2_to_homeiq_ground_truth(
        "cord_0001", cord_sample
    )
    assert gt_cord.expected_category == "RECEIPT"
    assert gt_cord.fields["total_amount_minor"] == 69000
    assert len(gt_cord.fields["line_items"]) == 2


def test_field_normalization_line_items_and_error_classification() -> None:
    # 1. Text normalization preserves semantic match while distinguishing raw exact match
    res_text = compare_field_value(
        "merchant_name",
        "Deccan Organic Provision Store",
        "  Deccan   Organic  Provision Store. ",
    )
    assert res_text.exact_match is False
    assert res_text.normalized_match is True
    assert res_text.match is True

    # 2. Multi-format date normalization
    res_date = compare_field_value("transaction_date", "2026-09-15", "15-Sep-2026")
    assert res_date.normalized_match is True
    assert res_date.match is True

    # 3. Order-invariant line-item comparison
    gt_items = [
        {"description": "Indrayani Organic Rice", "quantity": "5.0", "line_total_minor": 42000},
        {"description": "Tur Dal", "quantity": "2.0", "line_total_minor": 34000},
    ]
    pred_items_reordered = [
        {"description": "tur dal", "quantity": "2.0", "line_total_minor": 34000},
        {"description": "Indrayani  Organic Rice.", "quantity": "5.0", "line_total_minor": 42000},
    ]
    exact_li, norm_li, _ = compare_line_items(gt_items, pred_items_reordered)
    assert exact_li is False
    assert norm_li is True

    # 4. Hallucinated / extra field detection when ground-truth optional field is null
    _, metrics = compute_document_metrics(
        expected_fields={"vendor_name": "Acme", "invoice_number": None},
        predicted_fields={"vendor_name": "Acme", "invoice_number": "HALLUCINATED-123"},
        category_correct=True,
        database_tables_matched=True,
    )
    assert metrics.hallucinated_field_rate == 0.5
    assert metrics.precision == 0.5

    # 5. 12-Category Error Classification
    cat_rate, _ = classify_pipeline_exception(
        RuntimeError("generic::resource_exhausted: Quota exceeded for metric 429")
    )
    assert cat_rate == EvaluationErrorCategory.RATE_LIMIT

    cat_ocr, _ = classify_pipeline_exception(
        DocumentProcessingError(
            "Extraction confidence 0.48 is below minimum threshold 0.70.",
            stage="validation",
        )
    )
    assert cat_ocr == EvaluationErrorCategory.OCR_ERROR


@pytest.mark.asyncio
async def test_complete_evaluation_runner_and_artifacts(
    db_session: AsyncSession,
    tmp_path: Path,
) -> None:
    runner = HomeIQEvaluationRunner(session=db_session, use_live_gemini=False)
    report = await runner.run_complete_evaluation()

    assert report.total_documents == 12
    assert report.positive_documents_count == 10
    assert report.adversarial_documents_count == 2
    assert report.documents_passed == 12
    assert report.documents_failed == 0
    assert report.document_classification_accuracy == 1.0
    assert report.overall_normalized_match_rate == 1.0
    assert report.overall_f1 == 1.0
    assert report.overall_missing_field_rate == 0.0
    assert report.overall_hallucinated_field_rate == 0.0
    # Raw exact match rate should be < 1.0 because eval_0007 has raw OCR spacing noise
    assert 0.95 <= report.overall_exact_match_rate < 1.0

    # Verify error distribution captured both adversarial cases
    assert report.error_distribution["VALIDATION_ERROR"] == 1
    assert report.error_distribution["OCR_ERROR"] == 1

    # Verify all 6 RAG cases, 8 Domain Agents, and 4 E2E Scenarios passed
    assert len(report.rag_results) == 6
    assert all(r.status == "passed" for r in report.rag_results)
    assert len(report.agent_results) == 8
    assert all(a.status == "passed" for a in report.agent_results)
    assert len(report.end_to_end_results) == 4
    assert all(s.status == "passed" for s in report.end_to_end_results)

    # Verify artifact writing
    json_path, md_path = runner.write_evaluation_artifacts(report, output_dir=tmp_path)
    assert json_path.exists()
    assert md_path.exists()
    assert "HomeIQ — Dataset & Document Intelligence Evaluation Report" in md_path.read_text()


@pytest.mark.asyncio
async def test_evaluation_api_endpoints(api_client: AsyncClient) -> None:
    ds_resp = await api_client.get("/api/v1/intelligence/evaluation/datasets")
    assert ds_resp.status_code == 200
    assert len(ds_resp.json()["documents"]) == 12

    run_resp = await api_client.post("/api/v1/intelligence/evaluation/run")
    assert run_resp.status_code == 200
    body = run_resp.json()
    assert body["total_documents"] == 12
    assert body["documents_passed"] == 12
    assert body["overall_f1"] == 1.0
