"""Service for study notes and course study state.

Manages per-lesson personal notes and per-course last-accessed-lesson
state to support the study/learner view.
"""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.study_note_repo import StudyNoteRepository
from app.repositories.study_state_repo import StudyStateRepository
from app.schemas.study_note import StudyNoteResponse, StudyNoteUpdate
from app.schemas.study_state import StudyStateResponse, StudyStateUpdate


class StudyService:
    """Business logic for study notes and study state tracking."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.note_repo = StudyNoteRepository(db)
        self.state_repo = StudyStateRepository(db)

    # ── Study Notes ──────────────────────────────────────────

    async def get_study_note(self, lesson_id: uuid.UUID, user_id: uuid.UUID) -> StudyNoteResponse:
        note = await self.note_repo.get(user_id, lesson_id)
        if note is None:
            return StudyNoteResponse(content=None, updated_at=None)
        return StudyNoteResponse.model_validate(note)

    async def update_study_note(
        self, lesson_id: uuid.UUID, user_id: uuid.UUID, data: StudyNoteUpdate
    ) -> StudyNoteResponse:
        note = await self.note_repo.upsert(user_id, lesson_id, data.content)
        await self.db.commit()
        return StudyNoteResponse.model_validate(note)

    # ── Study State ──────────────────────────────────────────

    async def get_study_state(
        self, course_id: uuid.UUID, user_id: uuid.UUID
    ) -> StudyStateResponse | None:
        state = await self.state_repo.get(user_id, course_id)
        if state is None:
            return None
        return StudyStateResponse.model_validate(state)

    async def update_study_state(
        self, course_id: uuid.UUID, user_id: uuid.UUID, data: StudyStateUpdate
    ) -> StudyStateResponse:
        state = await self.state_repo.upsert(user_id, course_id, data.last_lesson_id)
        await self.db.commit()
        return StudyStateResponse.model_validate(state)
