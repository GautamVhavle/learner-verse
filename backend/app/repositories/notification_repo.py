"""Repository for Notification lookup, listing, and creation."""

import uuid
from datetime import UTC

from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification


class NotificationRepository:
    """Data-access layer for in-app notifications."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_by_user(self, user_id: uuid.UUID, limit: int = 50) -> list[Notification]:
        """Return notifications for a user, newest first."""
        result = await self.db.execute(
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def unread_count(self, user_id: uuid.UUID) -> int:
        """Count unread notifications for a user."""
        result = await self.db.execute(
            select(func.count())
            .select_from(Notification)
            .where(Notification.user_id == user_id, Notification.is_read == False)  # noqa: E712
        )
        return result.scalar_one()

    async def mark_read(
        self, notification_id: uuid.UUID, user_id: uuid.UUID
    ) -> Notification | None:
        """Mark a single notification as read. Returns the updated notification."""
        await self.db.execute(
            update(Notification)
            .where(Notification.id == notification_id, Notification.user_id == user_id)
            .values(is_read=True)
        )
        result = await self.db.execute(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def mark_all_read(self, user_id: uuid.UUID) -> int:
        """Mark all notifications as read for a user. Returns count updated."""
        result = await self.db.execute(
            update(Notification)
            .where(Notification.user_id == user_id, Notification.is_read == False)  # noqa: E712
            .values(is_read=True)
        )
        return result.rowcount

    async def delete_one(self, notification_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        """Delete a single notification. Returns True if deleted."""
        result = await self.db.execute(
            delete(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
        )
        return result.rowcount > 0

    async def create(self, notification: Notification) -> Notification:
        """Persist a new notification."""
        self.db.add(notification)
        await self.db.flush()
        return notification

    async def has_recent_of_type(
        self, user_id: uuid.UUID, notification_type: str, course_title: str
    ) -> bool:
        """Check if a notification of this type for this course exists today."""
        from datetime import date, datetime

        today_start = datetime.combine(date.today(), datetime.min.time(), tzinfo=UTC)
        result = await self.db.execute(
            select(func.count())
            .select_from(Notification)
            .where(
                Notification.user_id == user_id,
                Notification.type == notification_type,
                Notification.title.contains(course_title),
                Notification.created_at >= today_start,
            )
        )
        return result.scalar_one() > 0
