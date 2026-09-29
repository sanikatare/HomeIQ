"""Re-exports HomeIQEvaluationRunner and PublicDatasetAdapter (with stdlib fallback)."""
from __future__ import annotations

import sys
from pathlib import Path

repo_root = Path(__file__).resolve().parents[2]
backend_dir = repo_root / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

try:
    from app.evaluation.runner import HomeIQEvaluationRunner, PublicDatasetAdapter
except ModuleNotFoundError:
    from evaluation.stdlib_runner import run_stdlib_evaluation as HomeIQEvaluationRunner  # type: ignore[assignment]
    PublicDatasetAdapter = None  # type: ignore[assignment]

__all__ = ["HomeIQEvaluationRunner", "PublicDatasetAdapter"]
