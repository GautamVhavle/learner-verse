"""Service for study notes and course study state.

Manages per-lesson personal notes and per-course last-accessed-lesson
state to support the study/learner view.
"""

import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lesson import Lesson
from app.models.section import Section
from app.repositories.study_note_repo import StudyNoteRepository
from app.repositories.study_state_repo import StudyStateRepository
from app.schemas.study_note import StudyNoteResponse, StudyNoteUpdate
from app.schemas.study_state import StudyStateResponse, StudyStateUpdate
from app.services.course_access_service import ensure_learning_access


class StudyService:
    """Business logic for study notes and study state tracking."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.note_repo = StudyNoteRepository(db)
        self.state_repo = StudyStateRepository(db)

    async def _verify_course_access(self, course_id: uuid.UUID, user_id: uuid.UUID) -> None:
        """Verify user owns the course or is enrolled."""
        await ensure_learning_access(self.db, course_id, user_id)

    async def _verify_lesson_access(self, lesson_id: uuid.UUID, user_id: uuid.UUID) -> None:
        """Verify user owns or is enrolled in the course containing this lesson."""
        result = await self.db.execute(
            select(Section.course_id)
            .join(Lesson, Lesson.section_id == Section.id)
            .where(Lesson.id == lesson_id)
        )
        row = result.first()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found.")
        await self._verify_course_access(row[0], user_id)

    # ── Study Notes ──────────────────────────────────────────

    async def get_study_note(self, lesson_id: uuid.UUID, user_id: uuid.UUID) -> StudyNoteResponse:
        await self._verify_lesson_access(lesson_id, user_id)
        note = await self.note_repo.get(user_id, lesson_id)
        if note is None:
            return StudyNoteResponse(content=None, updated_at=None)
        return StudyNoteResponse.model_validate(note)

    async def update_study_note(
        self, lesson_id: uuid.UUID, user_id: uuid.UUID, data: StudyNoteUpdate
    ) -> StudyNoteResponse:
        await self._verify_lesson_access(lesson_id, user_id)
        note = await self.note_repo.upsert(user_id, lesson_id, data.content)
        await self.db.commit()
        return StudyNoteResponse.model_validate(note)

    # ── Study State ──────────────────────────────────────────

    async def get_study_state(
        self, course_id: uuid.UUID, user_id: uuid.UUID
    ) -> StudyStateResponse | None:
        await self._verify_course_access(course_id, user_id)
        state = await self.state_repo.get(user_id, course_id)
        if state is None:
            return None
        return StudyStateResponse.model_validate(state)

    async def update_study_state(
        self, course_id: uuid.UUID, user_id: uuid.UUID, data: StudyStateUpdate
    ) -> StudyStateResponse:
        await self._verify_course_access(course_id, user_id)
        lesson_in_course = await self.db.scalar(
            select(Lesson.id)
            .join(Section, Section.id == Lesson.section_id)
            .where(Lesson.id == data.last_lesson_id, Section.course_id == course_id)
        )
        if lesson_in_course is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Last lesson must belong to the course.",
            )
        state = await self.state_repo.upsert(user_id, course_id, data.last_lesson_id)
        await self.db.commit()
        return StudyStateResponse.model_validate(state)
