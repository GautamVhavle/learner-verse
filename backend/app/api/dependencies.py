"""Shared FastAPI dependencies for authentication and session management.

Provides ``get_current_user`` — the central authentication dependency
that resolves the current user in both single-user and Auth0-based
multi-user modes.
"""

import uuid

from fastapi import Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import verify_auth0_token
from app.models.user import User

# Fixed UUID for the single-user local development mode.
SINGLE_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User:
    """Resolve the current authenticated user.

    - **Single-user mode**: returns the default local user (auto-creates if missing).
    - **Multi-user mode**: verifies Auth0 JWT, looks up user by clerk_id
      (which stores the Auth0 ``sub`` claim). Auto-creates user on first login.
    """
    if settings.SINGLE_USER_MODE:
        result = await db.execute(select(User).where(User.id == SINGLE_USER_ID))
        user = result.scalar_one_or_none()
        if user is None:
            user = User(
                id=SINGLE_USER_ID,
                email="local@learnerverse.dev",
                display_name="Local User",
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        return user

    # Multi-user auth: verify Auth0 JWT
    auth0_id = await verify_auth0_token(request)

    result = await db.execute(select(User).where(User.clerk_id == auth0_id))
    user = result.scalar_one_or_none()

    if user is None:
        # Auto-create user on first authenticated request
        user = User(
            clerk_id=auth0_id,
            email=f"{auth0_id}@auth0.user",
            display_name="New User",
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    return user
