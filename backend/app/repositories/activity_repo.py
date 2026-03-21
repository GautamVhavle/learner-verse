"""Repository for ActivityLog upserts and range queries."""

import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.activity_log import ActivityLog


class ActivityRepository:
    """Data-access layer for daily activity logs (streak/heatmap source)."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def upsert(self, user_id: uuid.UUID, activity_date: date) -> ActivityLog:
        """Increment lessons_completed for a given user + date, creating if needed."""
        result = await self.db.execute(
            select(ActivityLog).where(
                ActivityLog.user_id == user_id,
                ActivityLog.activity_date == activity_date,
            )
        )
        entry = result.scalar_one_or_none()
        if entry:
            entry.lessons_completed += 1
        else:
            entry = ActivityLog(
                user_id=user_id,
                activity_date=activity_date,
                lessons_completed=1,
            )
            self.db.add(entry)
        return entry

    async def get_range(
        self,
        user_id: uuid.UUID,
        start_date: date,
        end_date: date,
    ) -> list[ActivityLog]:
        """Get all activity entries in a date range for a user."""
        result = await self.db.execute(
            select(ActivityLog)
            .where(
                ActivityLog.user_id == user_id,
                ActivityLog.activity_date >= start_date,
                ActivityLog.activity_date <= end_date,
            )
            .order_by(ActivityLog.activity_date.asc())
        )
        return list(result.scalars().all())

    async def get_all(self, user_id: uuid.UUID) -> list[ActivityLog]:
        """Get all activity entries for a user, ordered by date."""
        result = await self.db.execute(
            select(ActivityLog)
            .where(ActivityLog.user_id == user_id)
            .order_by(ActivityLog.activity_date.asc())
        )
        return list(result.scalars().all())
