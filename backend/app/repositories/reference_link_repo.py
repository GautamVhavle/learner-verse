"""Repository for ReferenceLink CRUD operations.

Extracted from LessonRepository to give reference links a dedicated
data-access module (Single Responsibility Principle).
"""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.reference_link import ReferenceLink


class ReferenceLinkRepository:
    """Data-access layer for lesson reference links."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def add(self, lesson_id: uuid.UUID, **kwargs) -> ReferenceLink:
        """Create a new reference link for a lesson, auto-assigning position."""
        count = await self.count_by_lesson(lesson_id)
        link = ReferenceLink(lesson_id=lesson_id, position=count, **kwargs)
        self.db.add(link)
        await self.db.flush()
        return link

    async def count_by_lesson(self, lesson_id: uuid.UUID) -> int:
        """Return the number of reference links attached to a lesson."""
        result = await self.db.execute(
            select(func.count(ReferenceLink.id)).where(ReferenceLink.lesson_id == lesson_id)
        )
        return result.scalar_one()

    async def delete(self, link_id: uuid.UUID) -> None:
        """Delete a reference link by ID (no-op if not found)."""
        result = await self.db.execute(select(ReferenceLink).where(ReferenceLink.id == link_id))
        link = result.scalar_one_or_none()
        if link:
            await self.db.delete(link)
            await self.db.flush()
