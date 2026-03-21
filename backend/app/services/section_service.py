"""Service for section management within courses.

Handles creation, listing, updates, deletion, reordering, and
duplication of sections. Verifies course ownership before mutations.
"""

import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.course import Course
from app.repositories.section_repo import SectionRepository
from app.schemas.section import (
    ReorderRequest,
    SectionBriefResponse,
    SectionCreate,
    SectionResponse,
    SectionUpdate,
)

MAX_SECTIONS_PER_COURSE = 50


class SectionService:
    """Business logic for course sections with ownership verification."""

    def __init__(self, db: AsyncSession):
        self.repo = SectionRepository(db)
        self.db = db

    async def _verify_course(self, course_id: uuid.UUID, user_id: uuid.UUID) -> None:
        """Ensure the course exists, is owned by the user, and is not deleted (lightweight)."""
        result = await self.db.execute(
            select(Course.id).where(
                Course.id == course_id,
                Course.user_id == user_id,
                Course.is_deleted == False,  # noqa: E712
            )
        )
        if result.scalar_one_or_none() is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")

    async def create_section(
        self, course_id: uuid.UUID, user_id: uuid.UUID, data: SectionCreate
    ) -> SectionResponse:
        """Create a new section in a course, enforcing the per-course limit."""
        await self._verify_course(course_id, user_id)
        count, next_pos = await self.repo.count_and_next_position(course_id)
        if count >= MAX_SECTIONS_PER_COURSE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Maximum of {MAX_SECTIONS_PER_COURSE} sections per course.",
            )
        section = await self.repo.create(
            course_id=course_id, title=data.title, description=data.description,
            position=next_pos,
        )
        await self.db.commit()
        # New section — construct response directly (no lessons yet)
        return SectionResponse(
            id=section.id,
            course_id=section.course_id,
            title=section.title,
            description=section.description,
            position=section.position,
            lessons=[],
            created_at=section.created_at,
            updated_at=section.updated_at,
        )

    async def get_section(self, section_id: uuid.UUID) -> SectionResponse:
        """Fetch a single section with its lessons."""
        section = await self.repo.get_by_id(section_id)
        if not section:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Section not found.")
        return SectionResponse.model_validate(section)

    async def list_sections(self, course_id: uuid.UUID, user_id: uuid.UUID) -> list[SectionResponse]:
        """List all sections in a course, ordered by position."""
        await self._verify_course(course_id, user_id)
        sections = await self.repo.list_by_course(course_id)
        return [SectionResponse.model_validate(s) for s in sections]

    async def update_section(
        self, section_id: uuid.UUID, user_id: uuid.UUID, data: SectionUpdate
    ) -> SectionResponse:
        """Apply partial updates to a section."""
        section = await self.repo.get_by_id(section_id)
        if not section:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Section not found.")
        await self._verify_course(section.course_id, user_id)
        fields = data.model_dump(exclude_unset=True)
        if fields:
            await self.repo.update(section, **fields)
        await self.db.commit()
        await self.db.refresh(section, attribute_names=["updated_at"])
        return SectionResponse.model_validate(section)

    async def delete_section(self, section_id: uuid.UUID, user_id: uuid.UUID) -> None:
        """Delete a section and all its child lessons."""
        section = await self.repo.get_by_id(section_id)
        if not section:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Section not found.")
        await self._verify_course(section.course_id, user_id)
        await self.repo.delete(section)
        await self.db.commit()

    async def reorder_sections(
        self, course_id: uuid.UUID, user_id: uuid.UUID, data: ReorderRequest
    ) -> list[SectionBriefResponse]:
        """Bulk-update section positions within a course."""
        await self._verify_course(course_id, user_id)
        items = [{"id": item.id, "position": item.position} for item in data.items]
        sections = await self.repo.reorder(course_id, items)
        await self.db.commit()
        return [SectionBriefResponse.model_validate(s) for s in sections]

    async def duplicate_section(
        self, section_id: uuid.UUID, user_id: uuid.UUID
    ) -> SectionResponse:
        """Deep-copy a section (with all lessons and reference links)."""
        section = await self.repo.get_by_id(section_id)
        if not section:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Section not found.")
        await self._verify_course(section.course_id, user_id)
        count = await self.repo.count_by_course(section.course_id)
        if count >= MAX_SECTIONS_PER_COURSE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Maximum of {MAX_SECTIONS_PER_COURSE} sections per course.",
            )
        new_section = await self.repo.duplicate(section)
        await self.db.commit()
        # Re-fetch the new section to get the full tree for the response
        loaded = await self.repo.get_by_id(new_section.id)
        return SectionResponse.model_validate(loaded)
