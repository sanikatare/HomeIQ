"""
HomeIQ — Top-Level CLI Entrypoint (`python -m evaluation.run`).

Automatically uses the full SQLAlchemy + FastAPI runner (`app.evaluation.run`)
when `sqlalchemy` and `pydantic` are installed in the Python environment, or
falls back seamlessly to `evaluation.stdlib_runner` in bare container environments.
"""
from __future__ import annotations

import sys
from pathlib import Path

repo_root = Path(__file__).resolve().parent.parent
backend_dir = repo_root / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))


def main() -> None:
    try:
        import pydantic  # noqa: F401
        import sqlalchemy  # noqa: F401
        from app.evaluation.run import main as full_main

        full_main()
    except ModuleNotFoundError:
        from evaluation.stdlib_runner import run_stdlib_evaluation

        report = run_stdlib_evaluation(repo_root)
        print(
            f"[HomeIQ Evaluation] Completed {report['total_documents']} documents "
            f"(Passed={report['documents_passed']}, Failed={report['documents_failed']}, "
            f"Normalized Field Accuracy={report['overall_field_accuracy'] * 100:.2f}%, "
            f"Raw Exact Match={report['overall_exact_match_rate'] * 100:.2f}%, "
            f"Numeric/Date Accuracy={report['overall_numeric_date_accuracy'] * 100:.2f}%, "
            f"Precision={report['overall_precision'] * 100:.2f}%, "
            f"Recall={report['overall_recall'] * 100:.2f}%, "
            f"F1={report['overall_f1'] * 100:.2f}%, "
            f"Missing Field Rate={report['overall_missing_field_rate'] * 100:.2f}%, "
            f"Hallucinated Field Rate={report['overall_hallucinated_field_rate'] * 100:.2f}%)."
        )
        print(f"[HomeIQ Evaluation] JSON Report -> {repo_root / 'evaluation/results/latest.json'}")
        print(f"[HomeIQ Evaluation] Markdown Report -> {repo_root / 'evaluation/results/latest.md'}")
        sys.exit(0 if report["documents_failed"] == 0 else 1)


if __name__ == "__main__":
    main()
