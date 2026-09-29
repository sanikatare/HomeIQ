"""
HomeIQ — Safe Database Initialization & Conditional Development Seeding (`python -m app.db.init_db`).

Invariants:
 - Applies schema creation across all 20 normalized tables idempotently.
 - NEVER inserts development seed data when `APP_ENV == "production"` or `APP_ENV == "staging"`.
 - Only seeds development data when `APP_ENV in ("development", "test")` and `seed_if_dev=True`
   (or `SEED_DEV_DATA=true`), and skips seeding if the household already exists.
"""
from __future__ import annotations

import asyncio

from sqlalchemy import select

from app.core.config import settings
from app.core.database import Base, engine, session_scope
from app.core.logging import configure_logging, get_logger
from app.db.models import Household
from app.db.seed import seed_development_data

logger = get_logger("init_db")


async def initialize_database(*, seed_if_dev: bool | None = None) -> dict[str, object]:
    configure_logging()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    should_seed = seed_if_dev if seed_if_dev is not None else settings.SEED_DEV_DATA
    seeded = False

    if settings.APP_ENV in {"production", "staging"}:
        if should_seed:
            logger.warning(
                "init_db.seed_blocked_in_production",
                environment=settings.APP_ENV,
            )
        return {
            "tables_initialized": len(Base.metadata.tables),
            "environment": settings.APP_ENV,
            "seeded_dev_data": False,
        }

    if should_seed:
        async with session_scope() as session:
            existing = (
                await session.execute(
                    select(Household).where(Household.slug == "tare-sharma-pune")
                )
            ).scalar_one_or_none()
            if existing is None:
                await seed_development_data(session)
                seeded = True
                logger.info("init_db.dev_seed_completed", slug="tare-sharma-pune")
            else:
                logger.info("init_db.dev_seed_already_present", slug="tare-sharma-pune")

    return {
        "tables_initialized": len(Base.metadata.tables),
        "environment": settings.APP_ENV,
        "seeded_dev_data": seeded,
    }


if __name__ == "__main__":
    asyncio.run(initialize_database())
