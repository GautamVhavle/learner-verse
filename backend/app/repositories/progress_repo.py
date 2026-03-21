"""Repository for LessonProgress toggle and batch lookup."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lesson_progress import LessonProgress


class ProgressRepository:
    """Data-access layer for per-lesson completion progress."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get(
        self, user_id: uuid.UUID, lesson_id: uuid.UUID
    ) -> LessonProgress | None:
        """Fetch a single progress record for a (user, lesson) pair."""
        result = await self.db.execute(
            select(LessonProgress).where(
                LessonProgress.user_id == user_id,
                LessonProgress.lesson_id == lesson_id,
            )
        )
        return result.scalar_one_or_none()

    async def toggle(
        self, user_id: uuid.UUID, lesson_id: uuid.UUID, completed: bool
    ) -> LessonProgress:
        """Set (or create) the completion state for a lesson.

        Creates a new record if none exists, otherwise updates the
        existing one. Timestamps are set/cleared accordingly.
        """
        existing = await self.get(user_id, lesson_id)
        if existing:
            existing.completed = completed
            existing.completed_at = (
                datetime.now(timezone.utc) if completed else None
            )
        else:
            existing = LessonProgress(
                user_id=user_id,
                lesson_id=lesson_id,
                completed=completed,
                completed_at=datetime.now(timezone.utc) if completed else None,
            )
            self.db.add(existing)
        return existing

    async def get_by_course_lessons(
        self, user_id: uuid.UUID, lesson_ids: list[uuid.UUID]
    ) -> list[LessonProgress]:
        """Batch-fetch progress records for multiple lessons at once."""
        if not lesson_ids:
            return []
        result = await self.db.execute(
            select(LessonProgress).where(
                LessonProgress.user_id == user_id,
                LessonProgress.lesson_id.in_(lesson_ids),
            )
        )
        return list(result.scalars().all())
