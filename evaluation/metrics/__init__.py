"""Re-exports field-level metrics and 12-category error classification helpers."""
from __future__ import annotations

import sys
from pathlib import Path

repo_root = Path(__file__).resolve().parents[2]
backend_dir = repo_root / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

try:
    from app.evaluation.metrics import (
        classify_pipeline_exception,
        compare_field_value,
        compare_line_items,
        compute_document_metrics,
        normalize_text,
    )
except ModuleNotFoundError:
    from evaluation.stdlib_runner import (
        classify_error_message as classify_pipeline_exception,  # type: ignore[assignment]
        compare_field_value,
        compare_line_items,
        compute_document_metrics,
        normalize_text,
    )

__all__ = [
    "classify_pipeline_exception",
    "compare_field_value",
    "compare_line_items",
    "compute_document_metrics",
    "normalize_text",
]
