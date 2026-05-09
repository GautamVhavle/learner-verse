"""Service for learning statistics, streaks, and activity heatmaps.

Computes current/longest streaks (with a configurable grace period),
most-active day of the week, and daily activity data for heatmap rendering.
"""

import uuid
from collections import Counter
from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.certificate import Certificate
from app.models.lesson_progress import LessonProgress
from app.repositories.activity_repo import ActivityRepository
from app.schemas.stats import (
    ActivityDayResponse,
    ActivityResponse,
    StatsOverviewResponse,
    StreakResponse,
)

WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
STREAK_GRACE_DAYS = 7


class StatsService:
    """Computes user learning statistics, streaks, and activity data."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.activity_repo = ActivityRepository(db)

    async def get_overview(
        self, user_id: uuid.UUID, today: date | None = None
    ) -> StatsOverviewResponse:
        """Build a high-level stats summary: completions, streaks, most active day."""
        if today is None:
            today = date.today()

        # Total courses completed (certificates count)
        cert_result = await self.db.execute(
            select(func.count(Certificate.id)).where(Certificate.user_id == user_id)
        )
        total_courses_completed = cert_result.scalar_one()

        # Total lessons completed
        lesson_result = await self.db.execute(
            select(func.count(LessonProgress.id)).where(
                LessonProgress.user_id == user_id,
                LessonProgress.completed == True,  # noqa: E712
            )
        )
        total_lessons_completed = lesson_result.scalar_one()

        # Get all activity for streaks + most active day
        all_activity = await self.activity_repo.get_all(user_id)
        active_dates = sorted(set(a.activity_date for a in all_activity))

        current_streak, longest_streak = self._compute_streaks(active_dates, today)

        # Most active day of week
        most_active_day = None
        if all_activity:
            day_counts: Counter[int] = Counter()
            for a in all_activity:
                day_counts[a.activity_date.weekday()] += a.lessons_completed
            if day_counts:
                most_active_weekday = max(day_counts, key=day_counts.get)  # type: ignore[arg-type]
                most_active_day = WEEKDAYS[most_active_weekday]

        return StatsOverviewResponse(
            total_courses_completed=total_courses_completed,
            total_lessons_completed=total_lessons_completed,
            current_streak=current_streak,
            longest_streak=longest_streak,
            most_active_day=most_active_day,
            total_active_days=len(active_dates),
        )

    async def get_streak(self, user_id: uuid.UUID, today: date | None = None) -> StreakResponse:
        """Return current and longest learning streaks."""
        if today is None:
            today = date.today()

        all_activity = await self.activity_repo.get_all(user_id)
        active_dates = sorted(set(a.activity_date for a in all_activity))

        current_streak, longest_streak = self._compute_streaks(active_dates, today)

        last_active = active_dates[-1].isoformat() if active_dates else None

        return StreakResponse(
            current_streak=current_streak,
            longest_streak=longest_streak,
            last_active_date=last_active,
        )

    async def get_activity(
        self, user_id: uuid.UUID, months: int = 12, today: date | None = None
    ) -> ActivityResponse:
        """Return daily lesson-completion counts for the last N months (heatmap data)."""
        if today is None:
            today = date.today()

        start_date = today - timedelta(days=months * 30)
        entries = await self.activity_repo.get_range(user_id, start_date, today)

        total = sum(e.lessons_completed for e in entries)
        days = [
            ActivityDayResponse(date=e.activity_date.isoformat(), count=e.lessons_completed)
            for e in entries
        ]

        return ActivityResponse(days=days, total_lessons=total)

    @staticmethod
    def _compute_streaks(active_dates: list[date], today: date) -> tuple[int, int]:
        """Compute current and longest streaks with a grace period.

        A streak persists as long as the gap between consecutive active
        days is at most ``STREAK_GRACE_DAYS``. The current streak counts
        backwards from the most recent active day only if that day is
        within the grace window of ``today``.
        """
        if not active_dates:
            return 0, 0

        # Longest streak (with grace period)
        longest = 1
        current_run = 1
        for i in range(1, len(active_dates)):
            gap = (active_dates[i] - active_dates[i - 1]).days
            if gap <= STREAK_GRACE_DAYS:
                current_run += 1
            else:
                current_run = 1
            longest = max(longest, current_run)

        # Current streak: walk backwards from most recent active date
        # Only count if last active date is within grace period of today
        last_active = active_dates[-1]
        days_since_last = (today - last_active).days
        if days_since_last > STREAK_GRACE_DAYS:
            return 0, longest

        current = 1
        for i in range(len(active_dates) - 1, 0, -1):
            gap = (active_dates[i] - active_dates[i - 1]).days
            if gap <= STREAK_GRACE_DAYS:
                current += 1
            else:
                break

        return current, longest
