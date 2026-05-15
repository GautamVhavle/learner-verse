"""Shared FastAPI dependencies for authentication and session management.

Provides ``get_current_user`` - the central authentication dependency
that resolves the current user in both single-user and Auth0-based
multi-user modes.
"""

import uuid

from fastapi import Depends, HTTPException, Request, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import set_committed_value

from app.core.config import settings
from app.core.database import get_db
from app.core.security import verify_auth0_token
from app.models.user import User

# Fixed UUID for the single-user local development mode.
SINGLE_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")

# Declares the Bearer token scheme for Swagger UI's Authorize button.
_http_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
    _credentials: HTTPAuthorizationCredentials | None = Security(_http_bearer),
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
    else:
        # Multi-user auth: verify Auth0 JWT
        auth0_id = await verify_auth0_token(request)

        result = await db.execute(select(User).where(User.clerk_id == auth0_id))
        user = result.scalar_one_or_none()

        if user is None:
            # Auto-create user on first authenticated request.
            # Use optimistic insert + catch IntegrityError to handle the race
            # condition where two concurrent requests for the same new user both
            # pass the "user is None" check on separate DB replicas.
            try:
                user = User(
                    clerk_id=auth0_id,
                    email=f"{auth0_id}@auth0.user",
                    display_name="New User",
                )
                db.add(user)
                await db.commit()
                await db.refresh(user)
            except IntegrityError:
                # Another request inserted the same clerk_id concurrently.
                await db.rollback()
                result = await db.execute(select(User).where(User.clerk_id == auth0_id))
                user = result.scalar_one_or_none()
                if user is None:
                    # Should be unreachable, but guard against unexpected states.
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Failed to retrieve user after concurrent creation.",
                    )

    # When the payment gateway is disabled, treat every user as Pro.
    # Use set_committed_value so SQLAlchemy does NOT mark the column as
    # dirty — this prevents the override from being accidentally flushed
    # to the database on the next commit.
    if not settings.PAYMENT_GATEWAY_ENABLED:
        set_committed_value(user, "is_pro", True)

    return user


async def get_superadmin_user(user: User = Depends(get_current_user)) -> User:
    """Dependency that restricts access to users listed in SUPERADMIN_EMAILS.

    Raises HTTP 403 if the authenticated user's email is not in the
    configured superadmin list. Used to protect all /superadmin/* routes.
    """
    if user.email.lower() not in settings.superadmin_emails_list:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superadmin access required.",
        )
    return user
