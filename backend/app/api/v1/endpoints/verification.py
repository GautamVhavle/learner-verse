"""Verification request endpoints — allow creators to apply for a verified badge.

Users submit a message explaining their intent; superadmins review the queue.
"""

from __future__ import annotations

from datetime import datetime

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


class VerificationHistoryItem(BaseModel):
    id: str
    message: str
    status: str
    admin_note: str | None = None
    created_at: datetime
    reviewed_at: datetime | None = None


class VerificationStatusResponse(BaseModel):
    has_pending: bool
    has_approved: bool
    # Most recent request details (if any)
    status: str | None = None
    message: str | None = None
    admin_note: str | None = None
    request_id: str | None = None
    # Full history of all requests
    history: list[VerificationHistoryItem] = []


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
    await session.commit()
    return {"detail": "Verification request submitted successfully."}


@router.delete("/request", status_code=status.HTTP_200_OK)
async def withdraw_verification_request(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> dict:
    """Withdraw a pending or rejected verification request."""
    result = await session.execute(
        select(VerificationRequest)
        .where(
            VerificationRequest.user_id == current_user.id,
            VerificationRequest.status.in_(["pending", "rejected"]),
        )
        .order_by(VerificationRequest.created_at.desc())
    )
    request = result.scalars().first()
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No pending or rejected verification request to withdraw.",
        )

    request.status = "withdrawn"
    await session.commit()
    return {"detail": "Verification request withdrawn successfully."}


@router.get("/status", response_model=VerificationStatusResponse)
async def get_verification_status(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> VerificationStatusResponse:
    """Return the current user's verification status, most recent application, and full history."""
    # Get all requests ordered by newest first
    all_result = await session.execute(
        select(VerificationRequest)
        .where(VerificationRequest.user_id == current_user.id)
        .order_by(VerificationRequest.created_at.desc())
    )
    all_requests = all_result.scalars().all()

    # Find the pending request (if any) — this takes priority as "latest"
    pending = next((r for r in all_requests if r.status == "pending"), None)
    # Otherwise use the most recently created request
    latest = pending or (all_requests[0] if all_requests else None)

    history = [
        VerificationHistoryItem(
            id=str(r.id),
            message=r.message,
            status=r.status,
            admin_note=r.admin_note,
            created_at=r.created_at,
            reviewed_at=r.reviewed_at,
        )
        for r in all_requests
    ]

    return VerificationStatusResponse(
        has_pending=latest.status == "pending" if latest else False,
        has_approved=current_user.is_verified_creator,
        status=latest.status if latest else None,
        message=latest.message if latest else None,
        admin_note=latest.admin_note if latest else None,
        request_id=str(latest.id) if latest else None,
        history=history,
    )
