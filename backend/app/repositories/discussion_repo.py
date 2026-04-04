"""Repository for discussion messages — cursor-based pagination."""

import uuid
from datetime import datetime

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.discussion_message import DiscussionMessage


class DiscussionRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_messages(
        self,
        course_id: uuid.UUID,
        *,
        before: datetime | None = None,
        limit: int = 50,
    ) -> list[DiscussionMessage]:
        """Fetch messages newest-first. If `before` is given, only older ones."""
        q = select(DiscussionMessage).where(
            DiscussionMessage.course_id == course_id
        )
        if before:
            q = q.where(DiscussionMessage.created_at < before)
        q = q.order_by(DiscussionMessage.created_at.desc()).limit(limit)
        result = await self.db.execute(q)
        return list(result.scalars().all())

    async def get_by_id(
        self, message_id: uuid.UUID
    ) -> DiscussionMessage | None:
        result = await self.db.execute(
            select(DiscussionMessage).where(DiscussionMessage.id == message_id)
        )
        return result.scalar_one_or_none()

    async def create(self, message: DiscussionMessage) -> DiscussionMessage:
        self.db.add(message)
        await self.db.flush()
        return message

    async def count(self, course_id: uuid.UUID) -> int:
        result = await self.db.execute(
            select(func.count()).where(
                DiscussionMessage.course_id == course_id
            )
        )
        return result.scalar_one()
