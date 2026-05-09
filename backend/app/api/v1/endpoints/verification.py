"""Verification request endpoints — allow creators to apply for a verified badge.

Users submit a message explaining their intent; superadmins review the queue.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, get_db
from app.models.user import User
from app.models.verification_request import VerificationRequest

router = APIRouter(prefix="/verification", tags=["verification"])


class VerificationRequestCreate(BaseModel):
    message: str = Field(..., min_length=20, max_length=2000)


class VerificationStatusResponse(BaseModel):
    has_pending: bool
    has_approved: bool
    # Most recent request details (if any)
    status: str | None = None
    message: str | None = None
    admin_note: str | None = None


@router.post("/request", status_code=status.HTTP_201_CREATED)
async def submit_verification_request(
    body: VerificationRequestCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> dict:
    """Submit a creator verification application.

    Only one pending request is allowed at a time.
    Users who are already verified cannot re-apply.
    """
    if current_user.is_verified_creator:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You are already a verified creator.",
        )

    existing = await session.execute(
        select(VerificationRequest).where(
            VerificationRequest.user_id == current_user.id,
            VerificationRequest.status == "pending",
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have a pending verification request. Please wait for it to be reviewed.",
        )

    req = VerificationRequest(
        user_id=current_user.id,
        message=body.message,
        status="pending",
    )
    session.add(req)
    await session.flush()
    return {"detail": "Verification request submitted successfully."}


@router.get("/status", response_model=VerificationStatusResponse)
async def get_verification_status(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> VerificationStatusResponse:
    """Return the current user's verification status and most recent application."""
    result = await session.execute(
        select(VerificationRequest)
        .where(VerificationRequest.user_id == current_user.id)
        .order_by(VerificationRequest.created_at.desc())
        .limit(1)
    )
    latest = result.scalar_one_or_none()

    return VerificationStatusResponse(
        has_pending=latest.status == "pending" if latest else False,
        has_approved=current_user.is_verified_creator,
        status=latest.status if latest else None,
        message=latest.message if latest else None,
        admin_note=latest.admin_note if latest else None,
    )
