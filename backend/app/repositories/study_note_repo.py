"""Repository for StudyNote upsert operations."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.study_note import StudyNote


class StudyNoteRepository:
    """Data-access layer for per-lesson personal study notes."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get(self, user_id: uuid.UUID, lesson_id: uuid.UUID) -> StudyNote | None:
        """Fetch the study note for a (user, lesson) pair."""
        result = await self.db.execute(
            select(StudyNote).where(
                StudyNote.user_id == user_id,
                StudyNote.lesson_id == lesson_id,
            )
        )
        return result.scalar_one_or_none()

    async def upsert(
        self, user_id: uuid.UUID, lesson_id: uuid.UUID, content: str | None
    ) -> StudyNote:
        """Create or update the study note for a (user, lesson) pair."""
        note = await self.get(user_id, lesson_id)
        if note is None:
            note = StudyNote(user_id=user_id, lesson_id=lesson_id, content=content)
            self.db.add(note)
        else:
            note.content = content
        await self.db.flush()
        await self.db.refresh(note)
        return note
