"""Service for lesson progress tracking and goal-pace computation.

Handles toggling lesson completion, computing per-course progress
breakdowns, and calculating whether a learner is on-track to meet
their goal dates.
"""

import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.course import Course
from app.models.section import Section
from app.repositories.activity_repo import ActivityRepository
from app.repositories.progress_repo import ProgressRepository
from app.schemas.progress import (
    CourseProgressResponse,
    GoalResponse,
    LessonProgressResponse,
    ProgressToggle,
    SectionProgressResponse,
)


class ProgressService:
    """Orchestrates lesson completion toggling and course progress computation."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ProgressRepository(db)
        self.activity_repo = ActivityRepository(db)

    # ── Toggle ───────────────────────────────────────────────

    async def toggle_lesson(
        self, lesson_id: uuid.UUID, user_id: uuid.UUID, data: ProgressToggle
    ) -> LessonProgressResponse:
        """Mark a lesson as completed or not-completed.

        When marking complete, also logs the activity for streak tracking.
        """
        progress = await self.repo.toggle(user_id, lesson_id, data.completed)

        if data.completed:
            await self.activity_repo.upsert(user_id, date.today())

        await self.db.commit()
        await self.db.refresh(progress)
        return LessonProgressResponse.model_validate(progress)

    # ── Course Progress ──────────────────────────────────────

    async def get_course_progress(
        self, course_id: uuid.UUID, user_id: uuid.UUID
    ) -> CourseProgressResponse:
        """Compute full progress breakdown for a course.

        Returns per-section breakdowns, overall percentage, per-lesson
        completion map, and optional goal-pace analysis.
        """
        # Fetch sections+lessons AND goal_date in parallel-friendly single session
        sections = await self._fetch_sections_with_lessons(course_id)
        all_lesson_ids = [lesson.id for section in sections for lesson in section.lessons]

        # Get goal_date with a lightweight scalar query
        goal_date_result = await self.db.execute(
            select(Course.goal_date).where(Course.id == course_id)
        )
        goal_date = goal_date_result.scalar_one_or_none()

        completed_set = await self._build_completed_set(user_id, all_lesson_ids)
        lesson_progress = {str(lid): lid in completed_set for lid in all_lesson_ids}
        section_responses, total_lessons, total_completed = self._build_section_breakdowns(
            sections, completed_set
        )

        percentage = round(total_completed / total_lessons * 100, 1) if total_lessons > 0 else 0

        goal = None
        if goal_date:
            goal = self.compute_pace(
                goal_date=goal_date,
                total_lessons=total_lessons,
                completed_lessons=total_completed,
            )

        return CourseProgressResponse(
            course_id=course_id,
            total_lessons=total_lessons,
            completed_lessons=total_completed,
            percentage=percentage,
            sections=section_responses,
            lesson_progress=lesson_progress,
            goal=goal,
        )

    # ── Goal Pace Computation ────────────────────────────────

    @staticmethod
    def compute_pace(
        goal_date: date,
        total_lessons: int,
        completed_lessons: int,
        today: date | None = None,
    ) -> GoalResponse:
        """Compute pace status relative to a goal date.

        Returns a GoalResponse indicating whether the learner is
        "ahead", "on_track", "behind", "completed", or "overdue".
        """
        if today is None:
            today = date.today()

        remaining = total_lessons - completed_lessons
        days_remaining = (goal_date - today).days

        # Already completed all lessons
        if remaining <= 0:
            return GoalResponse(
                goal_date=goal_date,
                pace_status="completed",
                lessons_per_week_needed=0,
                days_remaining=days_remaining,
                completed_early_by_days=max(days_remaining, 0) if days_remaining >= 0 else None,
            )

        # Goal date has passed and course isn't done
        if days_remaining <= 0:
            return GoalResponse(
                goal_date=goal_date,
                pace_status="overdue",
                lessons_per_week_needed=remaining * 7,
                days_remaining=days_remaining,
            )

        # Calculate required pace
        weeks_remaining = days_remaining / 7
        lessons_per_week_needed = remaining / weeks_remaining

        # Determine pace status using clear thresholds:
        #   "ahead"    - 70%+ done with 30%+ time remaining
        #   "behind"   - need more than 5 lessons/week
        #   "on_track" - everything else
        pace_status = _classify_pace(
            total_lessons=total_lessons,
            completed_lessons=completed_lessons,
            days_remaining=days_remaining,
            lessons_per_week_needed=lessons_per_week_needed,
        )

        return GoalResponse(
            goal_date=goal_date,
            pace_status=pace_status,
            lessons_per_week_needed=round(lessons_per_week_needed, 1),
            days_remaining=days_remaining,
        )

    # ── Private Helpers ──────────────────────────────────────

    async def _fetch_sections_with_lessons(self, course_id: uuid.UUID) -> list[Section]:
        """Load all sections (with lessons) for a course, ordered by position."""
        result = await self.db.execute(
            select(Section)
            .where(Section.course_id == course_id)
            .options(selectinload(Section.lessons))
            .order_by(Section.position)
        )
        return list(result.scalars().all())

    async def _build_completed_set(
        self, user_id: uuid.UUID, lesson_ids: list[uuid.UUID]
    ) -> set[uuid.UUID]:
        """Return the set of lesson IDs that the user has completed."""
        progress_records = await self.repo.get_by_course_lessons(user_id, lesson_ids)
        return {p.lesson_id for p in progress_records if p.completed}

    @staticmethod
    def _build_section_breakdowns(
        sections: list[Section],
        completed_set: set[uuid.UUID],
    ) -> tuple[list[SectionProgressResponse], int, int]:
        """Build per-section progress summaries and running totals."""
        section_responses: list[SectionProgressResponse] = []
        total_lessons = 0
        total_completed = 0

        for section in sections:
            lesson_ids = [lesson.id for lesson in section.lessons]
            section_completed = sum(1 for lid in lesson_ids if lid in completed_set)
            section_responses.append(
                SectionProgressResponse(
                    section_id=section.id,
                    title=section.title,
                    total_lessons=len(lesson_ids),
                    completed_lessons=section_completed,
                )
            )
            total_lessons += len(lesson_ids)
            total_completed += section_completed

        return section_responses, total_lessons, total_completed


# ── Module-level helpers ─────────────────────────────────────


def _classify_pace(
    *,
    total_lessons: int,
    completed_lessons: int,
    days_remaining: int,
    lessons_per_week_needed: float,
) -> str:
    """Classify pace as 'ahead', 'on_track', or 'behind'.

    Thresholds:
      - ahead:    ≥ 70% progress done and ≥ 30% of time remaining
      - behind:   required pace exceeds 5 lessons/week
      - on_track: everything else
    """
    if total_lessons > 0:
        progress_pct = completed_lessons / total_lessons
        # Use (days_remaining + 1) to avoid division by zero on the goal day
        time_pct_left = days_remaining / max(1, days_remaining + 1)
        if progress_pct >= 0.7 and time_pct_left >= 0.3:
            return "ahead"

    if lessons_per_week_needed > 5:
        return "behind"

    return "on_track"
