"""
HomeIQ — CLI Entrypoint for the Dataset & Document Evaluation Pipeline.

Usage (from repository root or `backend/` directory):
    PYTHONPATH=backend python -m app.evaluation.run
    PYTHONPATH=backend python -m app.evaluation.run --live-gemini
"""
from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base
from app.db.seed import seed_development_data
from app.evaluation.runner import HomeIQEvaluationRunner, resolve_repo_root


async def main_async(use_live_gemini: bool = False) -> int:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", future=True)

    @event.listens_for(engine.sync_engine, "connect")
    def _enable_sqlite_fks(dbapi_connection, connection_record) -> None:  # type: ignore[no-untyped-def]
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
    )

    repo_root = resolve_repo_root()
    async with session_factory() as session:
        await seed_development_data(session)
        await session.commit()

        runner = HomeIQEvaluationRunner(
            session=session,
            use_live_gemini=use_live_gemini,
            repo_root=repo_root,
        )
        report = await runner.run_complete_evaluation()
        await session.commit()
        json_path, md_path = runner.write_evaluation_artifacts(report)

    await engine.dispose()

    print(
        f"[HomeIQ Evaluation] Completed {report.total_documents} documents "
        f"(Passed={report.documents_passed}, Failed={report.documents_failed}, "
        f"Normalized Field Accuracy={report.overall_field_accuracy * 100:.2f}%, "
        f"Raw Exact Match={report.overall_exact_match_rate * 100:.2f}%, "
        f"F1={report.overall_f1 * 100:.2f}%)."
    )
    print(f"[HomeIQ Evaluation] JSON Report -> {json_path}")
    print(f"[HomeIQ Evaluation] Markdown Report -> {md_path}")
    return 0 if report.documents_failed == 0 else 1


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run the HomeIQ Dataset & Document Intelligence Evaluation Pipeline."
    )
    parser.add_argument(
        "--live-gemini",
        action="store_true",
        help="Use live Google Gemini API instead of deterministic CI analyzer.",
    )
    args = parser.parse_args()
    exit_code = asyncio.run(main_async(use_live_gemini=args.live_gemini))
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
