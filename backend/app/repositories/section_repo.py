"""Repository for Section CRUD, reordering, and duplication.

Queries eagerly load ``Section.lessons`` and ``Lesson.reference_links``
using chained joinedload (single) or selectinload (batch) to minimise
round-trips to the remote database.
"""

import uuid

from sqlalchemy import case, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.lesson import Lesson
from app.models.quiz_question import QuizQuestion
from app.models.section import Section


class SectionRepository:
    """Data-access layer for course sections."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ── CRUD ─────────────────────────────────────────────────

    async def create(self, course_id: uuid.UUID, title: str, position: int | None = None, **kwargs) -> Section:
        """Create a section at the given position (or the next available)."""
        if position is None:
            position = await self._next_position(course_id)
        section = Section(course_id=course_id, title=title, position=position, **kwargs)
        self.db.add(section)
        await self.db.flush()
        return section

    async def get_by_id(self, section_id: uuid.UUID) -> Section | None:
        """Fetch a section with lessons, reference links, and quiz questions."""
        result = await self.db.execute(
            select(Section)
            .options(
                joinedload(Section.lessons).joinedload(Lesson.reference_links),
                joinedload(Section.lessons).joinedload(Lesson.quiz_questions),
            )
            .where(Section.id == section_id)
        )
        return result.unique().scalar_one_or_none()

    async def list_by_course(self, course_id: uuid.UUID) -> list[Section]:
        """Return all sections in a course, ordered by position."""
        result = await self.db.execute(
            select(Section)
            .options(
                joinedload(Section.lessons).joinedload(Lesson.reference_links),
                joinedload(Section.lessons).joinedload(Lesson.quiz_questions),
            )
            .where(Section.course_id == course_id)
            .order_by(Section.position)
        )
        return list(result.unique().scalars().all())

    async def list_by_courses(self, course_ids: list[uuid.UUID]) -> dict[uuid.UUID, list[Section]]:
        """Batch-load sections for multiple courses in a single query."""
        if not course_ids:
            return {}
        result = await self.db.execute(
            select(Section)
            .options(
                joinedload(Section.lessons).joinedload(Lesson.reference_links),
                joinedload(Section.lessons).joinedload(Lesson.quiz_questions),
            )
            .where(Section.course_id.in_(course_ids))
            .order_by(Section.course_id, Section.position)
        )
        sections = list(result.unique().scalars().all())
        grouped: dict[uuid.UUID, list[Section]] = {cid: [] for cid in course_ids}
        for s in sections:
            grouped[s.course_id].append(s)
        return grouped

    async def count_and_next_position(self, course_id: uuid.UUID) -> tuple[int, int]:
        """Return (section_count, next_position) in a single query."""
        result = await self.db.execute(
            select(
                func.count(Section.id),
                func.coalesce(func.max(Section.position), -1) + 1,
            ).where(Section.course_id == course_id)
        )
        return result.one()  # type: ignore[return-value]

    async def count_by_course(self, course_id: uuid.UUID) -> int:
        """Count sections belonging to a course."""
        result = await self.db.execute(
            select(func.count(Section.id)).where(Section.course_id == course_id)
        )
        return result.scalar_one()

    async def update(self, section: Section, **kwargs) -> Section:
        """Apply partial field updates to an existing section."""
        for key, value in kwargs.items():
            if hasattr(section, key):
                setattr(section, key, value)
        await self.db.flush()
        return section

    async def delete(self, section: Section) -> None:
        """Remove a section (cascades to all child lessons and links)."""
        await self.db.delete(section)
        await self.db.flush()

    # ── Reordering ───────────────────────────────────────────

    async def reorder(self, course_id: uuid.UUID, items: list[dict]) -> list[Section]:
        """Bulk-update section positions within a course (single UPDATE)."""
        if not items:
            return await self.list_by_course(course_id)
        ids = [item["id"] for item in items]
        position_map = {item["id"]: item["position"] for item in items}
        await self.db.execute(
            update(Section)
            .where(Section.id.in_(ids), Section.course_id == course_id)
            .values(position=case(position_map, value=Section.id))
        )
        await self.db.flush()
        return await self.list_by_course(course_id)

    # ── Duplication ──────────────────────────────────────────

    async def duplicate(self, section: Section) -> Section:
        """Deep-copy a section (with lessons + reference links) in the same course."""
        return await self._deep_copy_section(
            source_section_id=section.id,
            target_course_id=section.course_id,
            title_suffix=" (Copy)",
        )

    async def duplicate_to_course(self, section: Section, target_course_id: uuid.UUID) -> Section:
        """Deep-copy a section into a *different* course, preserving the original title."""
        return await self._deep_copy_section(
            source_section_id=section.id,
            target_course_id=target_course_id,
            title_suffix="",
        )

    # ── Private Helpers ──────────────────────────────────────

    async def _deep_copy_section(
        self,
        source_section_id: uuid.UUID,
        target_course_id: uuid.UUID,
        title_suffix: str,
    ) -> Section:
        """Core duplication logic shared by ``duplicate`` and ``duplicate_to_course``.

        Re-fetches the source section with all nested relationships,
        then creates a full copy (section → lessons → reference links)
        under the target course.
        """
        # Re-fetch with all relationships loaded
        result = await self.db.execute(
            select(Section)
            .options(
                joinedload(Section.lessons).joinedload(Lesson.reference_links),
                joinedload(Section.lessons).joinedload(Lesson.quiz_questions),
            )
            .where(Section.id == source_section_id)
        )
        source = result.unique().scalar_one()

        # Create the section copy
        pos = await self._next_position(target_course_id)
        new_section = Section(
            course_id=target_course_id,
            title=f"{source.title}{title_suffix}",
            description=source.description,
            position=pos,
        )
        self.db.add(new_section)
        await self.db.flush()

        # Deep-copy each lesson and its reference links and quiz questions
        for lesson in source.lessons:
            new_lesson = self._clone_lesson(lesson, new_section.id)
            self.db.add(new_lesson)
            await self.db.flush()

            for link in lesson.reference_links:
                self.db.add(link.clone_for_lesson(new_lesson.id))

            for question in lesson.quiz_questions:
                self.db.add(self._clone_quiz_question(question, new_lesson.id))
        await self.db.flush()

        return new_section

    @staticmethod
    def _clone_lesson(lesson: Lesson, target_section_id: uuid.UUID) -> Lesson:
        """Create an in-memory copy of a lesson for a new section."""
        return Lesson(
            section_id=target_section_id,
            title=lesson.title,
            lesson_type=lesson.lesson_type,
            youtube_url=lesson.youtube_url,
            youtube_title=lesson.youtube_title,
            youtube_thumbnail=lesson.youtube_thumbnail,
            youtube_duration=lesson.youtube_duration,
            youtube_channel=lesson.youtube_channel,
            notes_markdown=lesson.notes_markdown,
            position=lesson.position,
        )

    @staticmethod
    def _clone_quiz_question(question: QuizQuestion, target_lesson_id: uuid.UUID) -> QuizQuestion:
        """Create an in-memory copy of a quiz question for a new lesson."""
        return QuizQuestion(
            lesson_id=target_lesson_id,
            question=question.question,
            options=list(question.options),
            correct_option=question.correct_option,
            position=question.position,
        )

    async def _next_position(self, course_id: uuid.UUID) -> int:
        """Return the next sequential position for a new section in the course."""
        result = await self.db.execute(
            select(func.coalesce(func.max(Section.position), -1)).where(
                Section.course_id == course_id
            )
        )
        return result.scalar_one() + 1
