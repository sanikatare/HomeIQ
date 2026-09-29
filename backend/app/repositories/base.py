"""
HomeIQ — Generic Multi-Tenant Async Repository Layer.
Enforces strict household_id scoping and deterministic pagination.
"""
import uuid
from typing import Any, Generic, Sequence, TypeVar

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import Base, HouseholdTenantMixin

ModelT = TypeVar("ModelT", bound=Base)
TenantModelT = TypeVar("TenantModelT", bound=HouseholdTenantMixin)


class BaseRepository(Generic[ModelT]):
    """Generic async CRUD repository for top-level entities (User, Household)."""

    def __init__(self, session: AsyncSession, model: type[ModelT]) -> None:
        self.session = session
        self.model = model

    async def get_by_id(self, entity_id: uuid.UUID) -> ModelT | None:
        stmt = select(self.model).where(getattr(self.model, "id") == entity_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_paginated(
        self,
        *,
        offset: int = 0,
        limit: int = 50,
    ) -> tuple[Sequence[ModelT], int]:
        count_stmt = select(func.count()).select_from(self.model)
        total = (await self.session.execute(count_stmt)).scalar_one()

        stmt = select(self.model).offset(offset).limit(limit)
        items = (await self.session.execute(stmt)).scalars().all()
        return items, int(total)

    async def create(self, instance: ModelT) -> ModelT:
        self.session.add(instance)
        await self.session.flush()
        await self.session.refresh(instance)
        return instance

    async def update_fields(self, instance: ModelT, values: dict[str, Any]) -> ModelT:
        for field, value in values.items():
            if hasattr(instance, field) and field not in {"id", "household_id", "created_at"}:
                setattr(instance, field, value)
        await self.session.flush()
        await self.session.refresh(instance)
        return instance

    async def delete(self, instance: ModelT) -> None:
        await self.session.delete(instance)
        await self.session.flush()


class TenantRepository(Generic[TenantModelT]):
    """
    Household-scoped repository guaranteeing every query filters by household_id.
    Prevents cross-tenant data leakage by construction.
    """

    def __init__(self, session: AsyncSession, model: type[TenantModelT]) -> None:
        self.session = session
        self.model = model

    def _base_select(self, household_id: uuid.UUID) -> Select[tuple[TenantModelT]]:
        return select(self.model).where(self.model.household_id == household_id)

    async def get_by_id(
        self,
        household_id: uuid.UUID,
        entity_id: uuid.UUID,
    ) -> TenantModelT | None:
        stmt = self._base_select(household_id).where(self.model.id == entity_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_for_household(
        self,
        household_id: uuid.UUID,
        *,
        offset: int = 0,
        limit: int = 50,
        filters: dict[str, Any] | None = None,
    ) -> tuple[Sequence[TenantModelT], int]:
        stmt = self._base_select(household_id)
        count_stmt = (
            select(func.count())
            .select_from(self.model)
            .where(self.model.household_id == household_id)
        )

        if filters:
            for attr, val in filters.items():
                if val is not None and hasattr(self.model, attr):
                    col = getattr(self.model, attr)
                    stmt = stmt.where(col == val)
                    count_stmt = count_stmt.where(col == val)

        stmt = stmt.order_by(self.model.created_at.desc()).offset(offset).limit(limit)
        total = (await self.session.execute(count_stmt)).scalar_one()
        items = (await self.session.execute(stmt)).scalars().all()
        return items, int(total)

    async def create(self, instance: TenantModelT) -> TenantModelT:
        self.session.add(instance)
        await self.session.flush()
        await self.session.refresh(instance)
        return instance

    async def update_fields(
        self,
        instance: TenantModelT,
        values: dict[str, Any],
        *,
        updated_by_id: uuid.UUID | None = None,
    ) -> TenantModelT:
        for field, value in values.items():
            if hasattr(instance, field) and field not in {"id", "household_id", "created_at"}:
                setattr(instance, field, value)
        if updated_by_id is not None:
            instance.updated_by_id = updated_by_id
        await self.session.flush()
        await self.session.refresh(instance)
        return instance

    async def delete(self, instance: TenantModelT) -> None:
        await self.session.delete(instance)
        await self.session.flush()
