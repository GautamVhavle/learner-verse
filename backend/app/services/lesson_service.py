"""Service for lesson management within sections.

Handles creation, updates, deletion, reordering, movement between
sections, duplication, and reference link management. Verifies
section/course ownership before all mutations.
"""

import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.course import Course
from app.models.section import Section
from app.repositories.lesson_repo import LessonRepository
from app.repositories.reference_link_repo import ReferenceLinkRepository
from app.repositories.section_repo import SectionRepository
from app.schemas.lesson import (
    LessonCreate,
    LessonMove,
    LessonResponse,
    LessonUpdate,
    ReferenceLinkCreate,
    ReferenceLinkResponse,
)
from app.schemas.section import ReorderRequest

MAX_LESSONS_PER_SECTION = 50
MAX_REFERENCE_LINKS_PER_LESSON = 20


class LessonService:
    """Business logic for lessons and their reference links."""

    def __init__(self, db: AsyncSession):
        self.lesson_repo = LessonRepository(db)
        self.section_repo = SectionRepository(db)
        self.ref_link_repo = ReferenceLinkRepository(db)
        self.db = db

    async def _verify_section_owner(self, section_id: uuid.UUID, user_id: uuid.UUID):
        """Verify section exists and belongs to a non-deleted course owned by user (single JOIN)."""
        result = await self.db.execute(
            select(Section.id, Section.course_id)
            .join(Course, Course.id == Section.course_id)
            .where(
                Section.id == section_id,
                Course.user_id == user_id,
                Course.is_deleted == False,  # noqa: E712
            )
        )
        row = result.first()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Section not found.")
        return row

    async def create_lesson(
        self, section_id: uuid.UUID, user_id: uuid.UUID, data: LessonCreate
    ) -> LessonResponse:
        """Create a new lesson in a section, enforcing the per-section limit."""
        await self._verify_section_owner(section_id, user_id)
        count = await self.lesson_repo.count_by_section(section_id)
        if count >= MAX_LESSONS_PER_SECTION:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Maximum of {MAX_LESSONS_PER_SECTION} lessons per section.",
            )
        lesson = await self.lesson_repo.create(section_id=section_id, title=data.title, lesson_type=data.lesson_type)
        await self.db.commit()
        # New lesson — construct response directly (no reference links yet)
        return LessonResponse(
            id=lesson.id,
            section_id=lesson.section_id,
            title=lesson.title,
            lesson_type=getattr(lesson, "lesson_type", "video"),
            reference_links=[],
            position=lesson.position,
            created_at=lesson.created_at,
            updated_at=lesson.updated_at,
        )

    async def get_lesson(self, lesson_id: uuid.UUID) -> LessonResponse:
        """Fetch a single lesson with its reference links."""
        lesson = await self.lesson_repo.get_by_id(lesson_id)
        if not lesson:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found.")
        return LessonResponse.model_validate(lesson)

    async def update_lesson(
        self, lesson_id: uuid.UUID, user_id: uuid.UUID, data: LessonUpdate
    ) -> LessonResponse:
        """Apply partial updates to a lesson."""
        lesson = await self.lesson_repo.get_by_id(lesson_id)
        if not lesson:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found.")
        await self._verify_section_owner(lesson.section_id, user_id)
        fields = data.model_dump(exclude_unset=True)
        if fields:
            await self.lesson_repo.update(lesson, **fields)
        await self.db.commit()
        await self.db.refresh(lesson, attribute_names=["updated_at"])
        return LessonResponse.model_validate(lesson)

    async def delete_lesson(self, lesson_id: uuid.UUID, user_id: uuid.UUID) -> None:
        """Delete a lesson and its reference links."""
        lesson = await self.lesson_repo.get_by_id(lesson_id)
        if not lesson:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found.")
        await self._verify_section_owner(lesson.section_id, user_id)
        await self.lesson_repo.delete(lesson)
        await self.db.commit()

    async def reorder_lessons(
        self, section_id: uuid.UUID, user_id: uuid.UUID, data: ReorderRequest
    ) -> list[LessonResponse]:
        """Bulk-update lesson positions within a section."""
        await self._verify_section_owner(section_id, user_id)
        items = [{"id": item.id, "position": item.position} for item in data.items]
        lessons = await self.lesson_repo.reorder(section_id, items)
        await self.db.commit()
        return [LessonResponse.model_validate(l) for l in lessons]

    async def move_lesson(
        self, lesson_id: uuid.UUID, user_id: uuid.UUID, data: LessonMove
    ) -> LessonResponse:
        """Move a lesson to a different section at the specified position."""
        lesson = await self.lesson_repo.get_by_id(lesson_id)
        if not lesson:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found.")
        await self._verify_section_owner(lesson.section_id, user_id)
        await self._verify_section_owner(data.target_section_id, user_id)

        count = await self.lesson_repo.count_by_section(data.target_section_id)
        if lesson.section_id != data.target_section_id and count >= MAX_LESSONS_PER_SECTION:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Target section has max {MAX_LESSONS_PER_SECTION} lessons.",
            )

        await self.lesson_repo.move(lesson, data.target_section_id, data.position)
        await self.db.commit()
        await self.db.refresh(lesson, attribute_names=["updated_at"])
        return LessonResponse.model_validate(lesson)

    async def duplicate_lesson(
        self, lesson_id: uuid.UUID, user_id: uuid.UUID
    ) -> LessonResponse:
        """Deep-copy a lesson (including all reference links)."""
        lesson = await self.lesson_repo.get_by_id(lesson_id)
        if not lesson:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found.")
        await self._verify_section_owner(lesson.section_id, user_id)
        count = await self.lesson_repo.count_by_section(lesson.section_id)
        if count >= MAX_LESSONS_PER_SECTION:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Maximum of {MAX_LESSONS_PER_SECTION} lessons per section.",
            )
        new_lesson = await self.lesson_repo.duplicate(lesson)
        await self.db.commit()
        # Re-fetch to get the full object with reference links
        loaded = await self.lesson_repo.get_by_id(new_lesson.id)
        return LessonResponse.model_validate(loaded)

    # ── Reference Links ──────────────────────────────────────

    async def add_reference_link(
        self,
        lesson_id: uuid.UUID,
        user_id: uuid.UUID,
        data: ReferenceLinkCreate,
    ) -> ReferenceLinkResponse:
        """Add a reference link to a lesson, enforcing the per-lesson limit."""
        lesson = await self.lesson_repo.get_by_id(lesson_id)
        if not lesson:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found.")
        await self._verify_section_owner(lesson.section_id, user_id)
        count = await self.ref_link_repo.count_by_lesson(lesson_id)
        if count >= MAX_REFERENCE_LINKS_PER_LESSON:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Maximum of {MAX_REFERENCE_LINKS_PER_LESSON} reference links per lesson.",
            )
        link = await self.ref_link_repo.add(
            lesson_id=lesson_id, **data.model_dump()
        )
        await self.db.commit()
        return ReferenceLinkResponse.model_validate(link)

    async def delete_reference_link(
        self,
        lesson_id: uuid.UUID,
        link_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> None:
        """Remove a reference link from a lesson."""
        lesson = await self.lesson_repo.get_by_id(lesson_id)
        if not lesson:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found.")
        await self._verify_section_owner(lesson.section_id, user_id)
        await self.ref_link_repo.delete(link_id)
        await self.db.commit()
