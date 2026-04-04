"""Discussion room endpoints — per-course group chat."""

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.discussion import (
    DiscussionMessageCreate,
    DiscussionMessageResponse,
    DiscussionPage,
)
from app.services.discussion_service import DiscussionService

router = APIRouter(prefix="/discussions", tags=["discussions"])


def _svc(db: AsyncSession) -> DiscussionService:
    return DiscussionService(db)


@router.get("/{course_id}", response_model=DiscussionPage)
async def list_messages(
    course_id: uuid.UUID,
    before: str | None = Query(None, description="ISO cursor for pagination"),
    limit: int = Query(50, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List discussion messages for a course (newest first, cursor-paginated)."""
    svc = _svc(db)
    return await svc.list_messages(course_id, user, before=before, limit=limit)


@router.post(
    "/{course_id}",
    response_model=DiscussionMessageResponse,
    status_code=201,
)
async def send_message(
    course_id: uuid.UUID,
    payload: DiscussionMessageCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a message in a course discussion room."""
    svc = _svc(db)
    return await svc.send_message(course_id, user, payload)
