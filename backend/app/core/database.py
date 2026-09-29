"""
HomeIQ — PostgreSQL 16 + SQLAlchemy 2.0 Async & Sync Database Configuration.
PostgreSQL is the single source of truth for all household relational and vector state.
"""
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any, AsyncGenerator

from sqlalchemy import DateTime, ForeignKey, MetaData, func, text
from sqlalchemy.ext.asyncio import (
    AsyncAttrs,
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from app.core.config import settings
from app.core.observability import (
    DB_FAILED_TRANSACTIONS_TOTAL,
    DB_POOL_CHECKED_OUT,
    DB_QUERY_DURATION,
)

# Standardized PostgreSQL naming convention for deterministic Alembic constraint names
POSTGRES_NAMING_CONVENTION: dict[str, str] = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(AsyncAttrs, DeclarativeBase):
    """Declarative base with deterministic constraint naming conventions."""

    metadata = MetaData(naming_convention=POSTGRES_NAMING_CONVENTION)


class UUIDPrimaryKeyMixin:
    """UUIDv4 primary key mixin."""

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )


class TimestampMixin:
    """Timezone-aware creation and modification timestamps."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class AuditMixin(TimestampMixin):
    """Tracks which user created and last modified a record alongside timestamps."""

    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    updated_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )


class HouseholdTenantMixin(UUIDPrimaryKeyMixin, AuditMixin):
    """
    Standard base mixin for household-owned entities.
    Enforces multi-tenant isolation via indexed household_id foreign key,
    UUID primary key, and user audit fields.
    """

    household_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("households.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )


def build_async_engine(database_url: str | None = None) -> AsyncEngine:
    url = database_url or settings.DATABASE_URL
    if url.startswith("sqlite"):
        return create_async_engine(url, echo=settings.DB_ECHO_SQL)
    return create_async_engine(
        url,
        pool_size=settings.DB_POOL_SIZE,
        max_overflow=settings.DB_MAX_OVERFLOW,
        pool_timeout=30,
        pool_recycle=1800,
        echo=settings.DB_ECHO_SQL,
        pool_pre_ping=True,
    )


engine: AsyncEngine = build_async_engine()

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


@asynccontextmanager
async def session_scope() -> AsyncGenerator[AsyncSession, None]:
    """Transactional async context manager for services, scripts, and workers."""
    t0 = time.perf_counter()
    DB_POOL_CHECKED_OUT.inc()
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
            DB_QUERY_DURATION.labels(operation="session_commit").observe(
                time.perf_counter() - t0
            )
        except Exception as exc:
            await session.rollback()
            DB_FAILED_TRANSACTIONS_TOTAL.labels(reason=type(exc).__name__).inc()
            raise
        finally:
            DB_POOL_CHECKED_OUT.dec()


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency yielding an AsyncSession per request with guaranteed rollback on error."""
    DB_POOL_CHECKED_OUT.inc()
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception as exc:
            await session.rollback()
            DB_FAILED_TRANSACTIONS_TOTAL.labels(reason=type(exc).__name__).inc()
            raise
        finally:
            DB_POOL_CHECKED_OUT.dec()


async def verify_database_connection(target_engine: AsyncEngine | None = None) -> bool:
    """Executes a lightweight connectivity check against PostgreSQL."""
    db_engine = target_engine or engine
    t0 = time.perf_counter()
    try:
        async with db_engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            ok = result.scalar_one() == 1
            DB_QUERY_DURATION.labels(operation="health_ping").observe(
                time.perf_counter() - t0
            )
            return ok
    except Exception:
        DB_FAILED_TRANSACTIONS_TOTAL.labels(reason="health_ping_failed").inc()
        return False


def get_pool_telemetry(target_engine: AsyncEngine | None = None) -> dict[str, Any]:
    """Returns connection pool health statistics."""
    db_engine = target_engine or engine
    sync_pool = getattr(db_engine.sync_engine, "pool", None)
    if sync_pool is None:
        return {"pool_type": "none", "status": "unknown"}
    return {
        "pool_type": type(sync_pool).__name__,
        "size": getattr(sync_pool, "size", lambda: 1)(),
        "checked_in": getattr(sync_pool, "checkedin", lambda: 0)(),
        "checked_out": getattr(sync_pool, "checkedout", lambda: 0)(),
        "overflow": getattr(sync_pool, "overflow", lambda: 0)(),
    }
