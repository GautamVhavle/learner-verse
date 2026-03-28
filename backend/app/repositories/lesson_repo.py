"""Repository for Lesson CRUD, reordering, and duplication.

All queries eagerly load ``Lesson.reference_links`` via joinedload
to prevent N+1 queries when building API responses.
"""

import uuid

from sqlalchemy import case, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.models.lesson import Lesson
from app.models.quiz_question import QuizQuestion
from app.models.reference_link import ReferenceLink


class LessonRepository:
    """Data-access layer for lessons within a section."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ── CRUD ─────────────────────────────────────────────────

    async def create(self, section_id: uuid.UUID, title: str, **kwargs) -> Lesson:
        """Create a lesson at the next available position in the section."""
        pos = await self._next_position(section_id)
        lesson = Lesson(section_id=section_id, title=title, position=pos, **kwargs)
        self.db.add(lesson)
        await self.db.flush()
        return lesson

    async def get_by_id(self, lesson_id: uuid.UUID) -> Lesson | None:
        """Fetch a lesson with its reference links and quiz questions eagerly loaded."""
        result = await self.db.execute(
            select(Lesson)
            .options(joinedload(Lesson.reference_links), joinedload(Lesson.quiz_questions))
            .where(Lesson.id == lesson_id)
        )
        return result.unique().scalar_one_or_none()

    async def list_by_section(self, section_id: uuid.UUID) -> list[Lesson]:
        """Return all lessons in a section, ordered by position."""
        result = await self.db.execute(
            select(Lesson)
            .options(joinedload(Lesson.reference_links), joinedload(Lesson.quiz_questions))
            .where(Lesson.section_id == section_id)
            .order_by(Lesson.position)
        )
        return list(result.unique().scalars().all())

    async def count_by_section(self, section_id: uuid.UUID) -> int:
        """Count lessons belonging to a section."""
        result = await self.db.execute(
            select(func.count(Lesson.id)).where(Lesson.section_id == section_id)
        )
        return result.scalar_one()

    async def update(self, lesson: Lesson, **kwargs) -> Lesson:
        """Apply partial field updates to an existing lesson."""
        for key, value in kwargs.items():
            if hasattr(lesson, key):
                setattr(lesson, key, value)
        await self.db.flush()
        return lesson

    async def delete(self, lesson: Lesson) -> None:
        """Remove a lesson (cascades to reference links)."""
        await self.db.delete(lesson)
        await self.db.flush()

    # ── Reordering & Movement ────────────────────────────────

    async def reorder(self, section_id: uuid.UUID, items: list[dict]) -> list[Lesson]:
        """Bulk-update lesson positions within a section (single UPDATE)."""
        if not items:
            return await self.list_by_section(section_id)
        ids = [item["id"] for item in items]
        position_map = {item["id"]: item["position"] for item in items}
        await self.db.execute(
            update(Lesson)
            .where(Lesson.id.in_(ids), Lesson.section_id == section_id)
            .values(position=case(position_map, value=Lesson.id))
        )
        await self.db.flush()
        return await self.list_by_section(section_id)

    async def move(self, lesson: Lesson, target_section_id: uuid.UUID, position: int) -> Lesson:
        """Move a lesson to a different section at the given position."""
        lesson.section_id = target_section_id
        lesson.position = position
        await self.db.flush()
        return lesson

    # ── Duplication ──────────────────────────────────────────

    async def duplicate(self, lesson: Lesson) -> Lesson:
        """Deep-copy a lesson (including all reference links)."""
        pos = await self._next_position(lesson.section_id)
        new_lesson = Lesson(
            section_id=lesson.section_id,
            title=f"{lesson.title} (Copy)",
            youtube_url=lesson.youtube_url,
            youtube_title=lesson.youtube_title,
            youtube_thumbnail=lesson.youtube_thumbnail,
            youtube_duration=lesson.youtube_duration,
            youtube_channel=lesson.youtube_channel,
            notes_markdown=lesson.notes_markdown,
            position=pos,
        )
        self.db.add(new_lesson)
        await self.db.flush()

        # Copy all reference links to the new lesson
        for link in lesson.reference_links:
            self._clone_reference_link(link, new_lesson.id)
        await self.db.flush()

        return new_lesson

    # ── Reference Link Helpers (delegated to ReferenceLinkRepo for CRUD) ─

    def _clone_reference_link(self, link: ReferenceLink, target_lesson_id: uuid.UUID) -> None:
        """Create a copy of a reference link under a different lesson (used during duplication)."""
        new_link = ReferenceLink(
            lesson_id=target_lesson_id,
            url=link.url,
            title=link.title,
            description=link.description,
            image=link.image,
            favicon=link.favicon,
            domain=link.domain,
            position=link.position,
        )
        self.db.add(new_link)

    # ── Private Helpers ──────────────────────────────────────

    async def _next_position(self, section_id: uuid.UUID) -> int:
        """Return the next sequential position for a new lesson in the section."""
        result = await self.db.execute(
            select(func.coalesce(func.max(Lesson.position), -1)).where(
                Lesson.section_id == section_id
            )
        )
        return result.scalar_one() + 1
