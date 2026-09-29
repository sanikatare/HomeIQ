"""
HomeIQ — Authentication & Multi-Tenant Household Context Resolution.
Validates user identity and resolves active HouseholdMember permissions.
"""
import uuid
from dataclasses import dataclass

from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.errors import TenantAccessDeniedError
from app.db.enums import HouseholdRole
from app.db.models import User
from app.repositories.household_repositories import (
    HouseholdMemberRepository,
    UserRepository,
)

# Default development UUIDs matching seed.py for frictionless local & test execution
DEFAULT_DEV_USER_ID = uuid.UUID("11111111-1111-4111-8111-111111111101")
DEFAULT_DEV_HOUSEHOLD_ID = uuid.UUID("22222222-2222-4222-8222-222222222201")


@dataclass(frozen=True)
class AuthenticatedContext:
    user_id: uuid.UUID
    email: str
    full_name: str
    household_id: uuid.UUID
    role: HouseholdRole
    can_approve_agent_actions: bool


async def get_current_context(
    session: AsyncSession = Depends(get_db_session),
    x_user_id: str | None = Header(default=None, alias="X-HomeIQ-User-Id"),
    x_household_id: str | None = Header(default=None, alias="X-HomeIQ-Household-Id"),
) -> AuthenticatedContext:
    """
    Resolves the authenticated user and verifies membership in the requested household.
    Supports header-based context injection (`X-HomeIQ-User-Id`, `X-HomeIQ-Household-Id`)
    alongside seeded fallback defaults in development/test environments.
    """
    try:
        user_uuid = uuid.UUID(x_user_id) if x_user_id else DEFAULT_DEV_USER_ID
        household_uuid = (
            uuid.UUID(x_household_id) if x_household_id else DEFAULT_DEV_HOUSEHOLD_ID
        )
    except ValueError as exc:
        raise TenantAccessDeniedError("Invalid UUID in authentication context headers.") from exc

    user_repo = UserRepository(session)
    member_repo = HouseholdMemberRepository(session)

    user: User | None = await user_repo.get_by_id(user_uuid)
    if user is None or not user.is_active:
        raise TenantAccessDeniedError("Authenticated user does not exist or is inactive.")

    membership = await member_repo.get_membership(household_uuid, user_uuid)
    if membership is None:
        raise TenantAccessDeniedError(
            f"User '{user.email}' is not a registered member of household '{household_uuid}'."
        )

    return AuthenticatedContext(
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        household_id=household_uuid,
        role=membership.role,
        can_approve_agent_actions=membership.can_approve_agent_actions,
    )
