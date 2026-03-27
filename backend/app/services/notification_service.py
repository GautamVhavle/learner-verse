"""Service for managing notifications and generating pace/streak alerts.

Handles CRUD operations for notifications and contains the business logic
for evaluating goals and generating pace-warning notifications.
"""

import uuid

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification
from app.repositories.course_repo import CourseRepository
from app.repositories.notification_repo import NotificationRepository
from app.services.progress_service import ProgressService


class NotificationService:
    """Business logic for notifications — CRUD and auto-generation."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = NotificationRepository(db)

    # ── Queries ──────────────────────────────────────────────

    async def list_notifications(
        self, user_id: uuid.UUID, limit: int = 50
    ) -> list[Notification]:
        """Return notifications for a user."""
        return await self.repo.list_by_user(user_id, limit)

    async def unread_count(self, user_id: uuid.UUID) -> int:
        """Count unread notifications for a user."""
        return await self.repo.unread_count(user_id)

    # ── Mutations ────────────────────────────────────────────

    async def mark_read(
        self, notification_id: uuid.UUID, user_id: uuid.UUID
    ) -> Notification:
        """Mark a notification as read. Raises 404 if not found."""
        notification = await self.repo.mark_read(notification_id, user_id)
        if not notification:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found.",
            )
        await self.db.commit()
        return notification

    async def mark_all_read(self, user_id: uuid.UUID) -> int:
        """Mark all notifications as read. Returns count updated."""
        count = await self.repo.mark_all_read(user_id)
        await self.db.commit()
        return count

    async def delete_notification(
        self, notification_id: uuid.UUID, user_id: uuid.UUID
    ) -> None:
        """Delete a notification. Raises 404 if not found."""
        deleted = await self.repo.delete_one(notification_id, user_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found.",
            )
        await self.db.commit()

    # ── Auto-generation: Pace Warnings ───────────────────────

    async def evaluate_and_notify(self, user_id: uuid.UUID) -> list[Notification]:
        """Evaluate all active goals and generate pace-warning notifications.

        Called on dashboard load. Generates at most one notification per
        course per day to avoid spamming.
        """
        course_repo = CourseRepository(self.db)
        progress_svc = ProgressService(self.db)
        courses = await course_repo.list_courses(user_id)
        created: list[Notification] = []

        for course in courses:
            if not course.goal_date:
                continue

            progress = await progress_svc.get_course_progress(course.id, user_id)
            goal = progress.goal
            if not goal or goal.pace_status in ("completed", "on_track", "ahead"):
                continue

            # Only generate one notification per course per day
            already_notified = await self.repo.has_recent_of_type(
                user_id, "pace_warning", course.title
            )
            if already_notified:
                continue

            if goal.pace_status == "behind":
                notif = await self._create_pace_warning(
                    user_id, course.title, goal.lessons_per_week_needed, goal.days_remaining
                )
                created.append(notif)
            elif goal.pace_status == "overdue":
                notif = await self._create_overdue_warning(
                    user_id, course.title
                )
                created.append(notif)

        if created:
            await self.db.commit()

        return created

    # ── Private Helpers ──────────────────────────────────────

    async def _create_pace_warning(
        self,
        user_id: uuid.UUID,
        course_title: str,
        lessons_per_week: float,
        days_remaining: int,
    ) -> Notification:
        """Create a pace-warning notification for a behind-schedule course."""
        notification = Notification(
            user_id=user_id,
            type="pace_warning",
            title=f"Falling behind on {course_title}",
            message=(
                f"You need to complete ~{lessons_per_week:.0f} lessons/week "
                f"to finish in {days_remaining} days. Pick up the pace!"
            ),
        )
        return await self.repo.create(notification)

    async def _create_overdue_warning(
        self, user_id: uuid.UUID, course_title: str
    ) -> Notification:
        """Create an overdue notification for a past-deadline course."""
        notification = Notification(
            user_id=user_id,
            type="pace_warning",
            title=f"{course_title} is overdue",
            message=(
                "Your goal date has passed. Consider updating your goal "
                "or completing remaining lessons."
            ),
        )
        return await self.repo.create(notification)
