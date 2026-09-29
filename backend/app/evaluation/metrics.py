"""
HomeIQ — Field-Level Normalization, Bipartite Line-Item Comparison & Error Classification.

Implements:
 - Exact match & Normalized exact match (whitespace, case, punctuation)
 - Configurable numeric tolerance comparison
 - Multi-format date normalization (`YYYY-MM-DD`, `DD-MMM-YYYY`, `DD/MM/YYYY`, `YYYY.MM.DD`)
 - Order-invariant line-item matching
 - Precision, Recall, F1, Missing Field Rate, Extra Field Rate
 - 12-Category Error Classifier (`OCR_ERROR`, `RATE_LIMIT`, `VALIDATION_ERROR`, etc.)
"""
from __future__ import annotations

import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Any

from app.core.errors import DocumentProcessingError
from app.evaluation.schemas import (
    DocumentEvaluationMetrics,
    EvaluationErrorCategory,
    FieldComparisonResult,
)

DATE_FORMATS: tuple[str, ...] = (
    "%Y-%m-%d",
    "%d-%b-%Y",
    "%d-%B-%Y",
    "%d/%m/%Y",
    "%Y.%m.%d",
    "%Y/%m/%d",
)


def normalize_text(value: str) -> str:
    """
    Normalizes whitespace, case, and superficial trailing punctuation without
    hiding substantive semantic or entity differences.
    """
    collapsed = " ".join(value.strip().lower().split())
    # Strip trailing periods/commas or currency suffixes like "/-"
    collapsed = re.sub(r"[/\-.,:;]+$", "", collapsed).strip()
    return collapsed


def try_parse_date(value: Any) -> date | None:
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()
    if not isinstance(value, str):
        return None
    cleaned = value.strip()
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(cleaned, fmt).date()
        except ValueError:
            continue
    return None


def try_parse_decimal(value: Any) -> Decimal | None:
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, (int, float, Decimal)):
        try:
            return Decimal(str(value))
        except InvalidOperation:
            return None
    if isinstance(value, str):
        # Only parse strings that look strictly numeric
        if re.fullmatch(r"[-+]?\d+(\.\d+)?", value.strip()):
            try:
                return Decimal(value.strip())
            except InvalidOperation:
                return None
    return None


def compare_line_items(
    expected_items: list[dict[str, Any]],
    predicted_items: list[dict[str, Any]],
    *,
    numeric_tolerance: float = 0.01,
) -> tuple[bool, bool, str]:
    """
    Order-invariant comparison of extracted line items against ground truth.
    Returns (exact_match, normalized_match, notes).
    """
    if len(expected_items) != len(predicted_items):
        return (
            False,
            False,
            f"Line item count mismatch: expected {len(expected_items)}, got {len(predicted_items)}",
        )
    if not expected_items:
        return True, True, "Both line_items lists are empty"

    unmatched_pred = list(range(len(predicted_items)))
    all_exact = True

    for exp in expected_items:
        exp_desc_norm = normalize_text(str(exp.get("description", "")))
        exp_total = try_parse_decimal(exp.get("line_total_minor"))
        exp_qty = try_parse_decimal(exp.get("quantity", "1.0"))

        matched_idx: int | None = None
        for idx in unmatched_pred:
            pred = predicted_items[idx]
            pred_desc_norm = normalize_text(str(pred.get("description", "")))
            pred_total = try_parse_decimal(pred.get("line_total_minor"))
            pred_qty = try_parse_decimal(pred.get("quantity", "1.0"))

            desc_ok = exp_desc_norm == pred_desc_norm
            total_ok = (
                exp_total is not None
                and pred_total is not None
                and abs(float(exp_total - pred_total)) <= numeric_tolerance
            )
            qty_ok = (
                exp_qty is not None
                and pred_qty is not None
                and abs(float(exp_qty - pred_qty)) <= numeric_tolerance
            )

            if desc_ok and total_ok and qty_ok:
                matched_idx = idx
                if str(exp.get("description", "")) != str(pred.get("description", "")):
                    all_exact = False
                break

        if matched_idx is None:
            return (
                False,
                False,
                f"Unmatched ground-truth line item: '{exp.get('description')}' ({exp.get('line_total_minor')})",
            )
        unmatched_pred.remove(matched_idx)

    return all_exact, True, f"Matched all {len(expected_items)} line items (order-invariant)"


def compare_field_value(
    field_name: str,
    expected: Any,
    predicted: Any,
    *,
    numeric_tolerance: float = 0.01,
) -> FieldComparisonResult:
    """
    Evaluates a single field between ground truth and pipeline output.
    """
    # 1. Both null/None
    if expected is None and predicted is None:
        return FieldComparisonResult(
            expected=None,
            predicted=None,
            exact_match=True,
            normalized_match=True,
            match=True,
            comparison_mode="null_check",
            notes="Both expected and predicted are null (no hallucination of missing optional field)",
        )

    # 2. One is null and the other is not
    if expected is None or predicted is None:
        return FieldComparisonResult(
            expected=expected,
            predicted=predicted,
            exact_match=False,
            normalized_match=False,
            match=False,
            comparison_mode="null_check",
            notes="Missing field" if predicted is None else "Hallucinated extra value for null field",
        )

    # 3. Line items array comparison
    if field_name == "line_items" and isinstance(expected, list) and isinstance(predicted, list):
        exact, norm_ok, note = compare_line_items(
            expected, predicted, numeric_tolerance=numeric_tolerance
        )
        return FieldComparisonResult(
            expected=expected,
            predicted=predicted,
            exact_match=exact,
            normalized_match=norm_ok,
            match=norm_ok,
            comparison_mode="line_items",
            notes=note,
        )

    # 4. Date comparison (for date fields or parseable dates)
    if "date" in field_name or "period" in field_name:
        exp_date = try_parse_date(expected)
        pred_date = try_parse_date(predicted)
        if exp_date is not None and pred_date is not None:
            is_same = exp_date == pred_date
            raw_exact = str(expected) == str(predicted) and is_same
            return FieldComparisonResult(
                expected=expected,
                predicted=predicted,
                exact_match=raw_exact,
                normalized_match=is_same,
                match=is_same,
                comparison_mode="date_iso",
                notes=f"Normalized ISO date: {exp_date.isoformat()} vs {pred_date.isoformat()}",
            )

    # 5. Boolean comparison
    if isinstance(expected, bool) or isinstance(predicted, bool):
        is_same = bool(expected) is bool(predicted) and type(expected) is type(predicted)
        return FieldComparisonResult(
            expected=expected,
            predicted=predicted,
            exact_match=is_same,
            normalized_match=is_same,
            match=is_same,
            comparison_mode="exact",
        )

    # 6. Numeric comparison (excluding identifier strings like account/policy numbers)
    is_identifier_field = any(
        tok in field_name
        for tok in ("number", "phone", "code", "identifier", "serial", "model")
    )
    if not is_identifier_field:
        exp_num = try_parse_decimal(expected)
        pred_num = try_parse_decimal(predicted)
        if exp_num is not None and pred_num is not None:
            diff = abs(float(exp_num - pred_num))
            tol_ok = diff <= numeric_tolerance
            exact_ok = exp_num == pred_num
            return FieldComparisonResult(
                expected=expected,
                predicted=predicted,
                exact_match=exact_ok,
                normalized_match=tol_ok,
                match=tol_ok,
                comparison_mode="numeric_tolerance",
                notes=f"abs_diff={diff:.4f} (tolerance={numeric_tolerance})",
            )

    # 7. Text comparison (exact & normalized)
    exp_str = str(expected)
    pred_str = str(predicted)
    exact_ok = exp_str == pred_str
    norm_ok = normalize_text(exp_str) == normalize_text(pred_str)
    return FieldComparisonResult(
        expected=expected,
        predicted=predicted,
        exact_match=exact_ok,
        normalized_match=norm_ok,
        match=norm_ok,
        comparison_mode="normalized_text",
    )


def compute_document_metrics(
    *,
    expected_fields: dict[str, Any],
    predicted_fields: dict[str, Any],
    category_correct: bool,
    database_tables_matched: bool,
    numeric_tolerance: float = 0.01,
) -> tuple[dict[str, FieldComparisonResult], DocumentEvaluationMetrics]:
    """
    Calculates field-level Precision, Recall, F1, Exact Match, Normalized Match,
    Missing Field Rate, and Extra Field Rate.
    """
    field_results: dict[str, FieldComparisonResult] = {}

    tp = 0  # Non-null ground-truth fields accurately extracted
    fp = 0  # Incorrectly extracted values OR hallucinated values for null ground-truth fields
    fn = 0  # Non-null ground-truth fields missed (predicted is None) or wrong value
    tn_nulls = 0  # Optional fields that are null in both GT and prediction

    non_null_gt_count = 0
    missing_count = 0
    extra_count = 0

    all_keys = list(dict.fromkeys([*expected_fields.keys(), *predicted_fields.keys()]))

    for key in expected_fields:
        exp_val = expected_fields[key]
        pred_val = predicted_fields.get(key)
        res = compare_field_value(
            key, exp_val, pred_val, numeric_tolerance=numeric_tolerance
        )
        field_results[key] = res

        if exp_val is not None:
            non_null_gt_count += 1
            if pred_val is None:
                missing_count += 1
                fn += 1
            elif res.match:
                tp += 1
            else:
                fp += 1
                fn += 1
        else:
            # Ground truth is explicitly null
            if pred_val is None:
                tn_nulls += 1
            else:
                extra_count += 1
                fp += 1

    # Check if predicted payload contains unexpected extra schema keys not in ground truth
    for key in all_keys:
        if key not in expected_fields and predicted_fields.get(key) is not None:
            extra_count += 1
            fp += 1

    total_evaluated = len(expected_fields) or 1
    exact_matches = sum(1 for r in field_results.values() if r.exact_match)
    norm_matches = sum(1 for r in field_results.values() if r.normalized_match)

    precision = tp / (tp + fp) if (tp + fp) > 0 else (1.0 if tp == 0 and fp == 0 else 0.0)
    recall = tp / (tp + fn) if (tp + fn) > 0 else (1.0 if tp == 0 and fn == 0 else 0.0)
    f1 = (
        (2 * precision * recall) / (precision + recall)
        if (precision + recall) > 0
        else 0.0
    )

    missing_rate = missing_count / non_null_gt_count if non_null_gt_count > 0 else 0.0
    extra_rate = extra_count / total_evaluated

    num_date_fields = [
        r
        for r in field_results.values()
        if r.comparison_mode in {"numeric_tolerance", "date_iso"}
    ]
    numeric_date_acc = (
        round(sum(1 for r in num_date_fields if r.match) / len(num_date_fields), 4)
        if num_date_fields
        else 1.0
    )

    metrics = DocumentEvaluationMetrics(
        field_accuracy=round(norm_matches / total_evaluated, 4),
        exact_match_rate=round(exact_matches / total_evaluated, 4),
        normalized_match_rate=round(norm_matches / total_evaluated, 4),
        numeric_date_accuracy=numeric_date_acc,
        precision=round(precision, 4),
        recall=round(recall, 4),
        f1=round(f1, 4),
        missing_field_rate=round(missing_rate, 4),
        extra_field_rate=round(extra_rate, 4),
        hallucinated_field_rate=round(extra_rate, 4),
        category_correct=category_correct,
        database_tables_matched=database_tables_matched,
    )
    return field_results, metrics


def classify_pipeline_exception(exc: Exception) -> tuple[EvaluationErrorCategory, str]:
    """
    Maps any exception from the Document Intelligence, RAG, or Agent pipeline
    into one of the 12 meaningful `EvaluationErrorCategory` classifications.
    """
    msg = str(exc)
    msg_lower = msg.lower()
    stage = getattr(exc, "stage", "unknown")

    if any(tok in msg_lower for tok in ("resource_exhausted", "quota exceeded", "rate limit", "429")):
        return EvaluationErrorCategory.RATE_LIMIT, stage
    if any(tok in msg_lower for tok in ("timeout", "timed out", "deadline exceeded")):
        return EvaluationErrorCategory.TIMEOUT, stage
    if "below minimum threshold" in msg_lower or "blurry" in msg_lower or "ocr" in msg_lower:
        return EvaluationErrorCategory.OCR_ERROR, stage
    if "classified document as" in msg_lower and "omitted" in msg_lower:
        return EvaluationErrorCategory.DOCUMENT_CLASSIFICATION_ERROR, stage
    if isinstance(exc, DocumentProcessingError):
        if stage == "validation":
            return EvaluationErrorCategory.VALIDATION_ERROR, stage
        if stage == "database_update":
            return EvaluationErrorCategory.DATABASE_ERROR, stage
        if stage == "gemini_analysis":
            return EvaluationErrorCategory.MODEL_ERROR, stage
        return EvaluationErrorCategory.EXTRACTION_ERROR, stage
    if "sqlalchemy" in msg_lower or "foreign key" in msg_lower or "integrityerror" in msg_lower:
        return EvaluationErrorCategory.DATABASE_ERROR, stage
    if "embedding" in msg_lower or "pgvector" in msg_lower:
        return EvaluationErrorCategory.EMBEDDING_ERROR, stage
    if "retrieval" in msg_lower:
        return EvaluationErrorCategory.RETRIEVAL_ERROR, stage

    return EvaluationErrorCategory.UNKNOWN, stage
