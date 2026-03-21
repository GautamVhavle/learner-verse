"""Repository for CourseStudyState upsert operations."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.course_study_state import CourseStudyState


class StudyStateRepository:
    """Data-access layer for tracking the last-accessed lesson per course."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get(
        self, user_id: uuid.UUID, course_id: uuid.UUID
    ) -> CourseStudyState | None:
        """Fetch the study state for a (user, course) pair."""
        result = await self.db.execute(
            select(CourseStudyState).where(
                CourseStudyState.user_id == user_id,
                CourseStudyState.course_id == course_id,
            )
        )
        return result.scalar_one_or_none()

    async def upsert(
        self,
        user_id: uuid.UUID,
        course_id: uuid.UUID,
        last_lesson_id: uuid.UUID,
    ) -> CourseStudyState:
        """Create or update the study state, recording the last-accessed lesson."""
        state = await self.get(user_id, course_id)
        if state is None:
            state = CourseStudyState(
                user_id=user_id,
                course_id=course_id,
                last_lesson_id=last_lesson_id,
                last_accessed_at=datetime.now(timezone.utc),
            )
            self.db.add(state)
        else:
            state.last_lesson_id = last_lesson_id
            state.last_accessed_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(state)
        return state
