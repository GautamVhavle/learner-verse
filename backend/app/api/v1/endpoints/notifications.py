"""API endpoints for in-app notifications."""

import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.notification import NotificationResponse, UnreadCountResponse
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["notifications"])


def _service(db: AsyncSession) -> NotificationService:
    return NotificationService(db)


@router.get("", response_model=list[NotificationResponse])
async def list_notifications(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all notifications for the current user (newest first)."""
    svc = _service(db)
    notifications = await svc.list_notifications(user.id)
    return [NotificationResponse.model_validate(n) for n in notifications]


@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the number of unread notifications (for badge display)."""
    svc = _service(db)
    count = await svc.unread_count(user.id)
    return UnreadCountResponse(count=count)


@router.post("/evaluate", response_model=list[NotificationResponse])
async def evaluate_notifications(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Evaluate goals and generate pace-warning notifications.

    Called on dashboard load. Returns any newly created notifications.
    """
    svc = _service(db)
    created = await svc.evaluate_and_notify(user.id)
    return [NotificationResponse.model_validate(n) for n in created]


@router.put("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark a single notification as read."""
    svc = _service(db)
    notification = await svc.mark_read(notification_id, user.id)
    return NotificationResponse.model_validate(notification)


@router.put("/read-all", status_code=status.HTTP_200_OK)
async def mark_all_read(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark all notifications as read."""
    svc = _service(db)
    count = await svc.mark_all_read(user.id)
    return {"updated": count}


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(
    notification_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single notification."""
    svc = _service(db)
    await svc.delete_notification(notification_id, user.id)
