"""Repository for chat thread and message operations."""

import uuid

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.chat_message import ChatMessage
from app.models.chat_thread import ChatThread

MAX_THREADS_PER_USER = 100


class ChatRepository:
    """Data-access layer for chat threads and messages."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Threads ────────────────────────────────────────────

    async def create_thread(self, user_id: uuid.UUID, title: str = "New Chat") -> ChatThread:
        thread = ChatThread(user_id=user_id, title=title)
        self.db.add(thread)
        await self.db.flush()
        return thread

    async def get_thread(self, thread_id: uuid.UUID, user_id: uuid.UUID) -> ChatThread | None:
        result = await self.db.execute(
            select(ChatThread).where(
                ChatThread.id == thread_id,
                ChatThread.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_thread_with_messages(
        self, thread_id: uuid.UUID, user_id: uuid.UUID
    ) -> ChatThread | None:
        result = await self.db.execute(
            select(ChatThread)
            .options(selectinload(ChatThread.messages))
            .where(
                ChatThread.id == thread_id,
                ChatThread.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def list_threads(self, user_id: uuid.UUID) -> list[ChatThread]:
        result = await self.db.execute(
            select(ChatThread)
            .where(ChatThread.user_id == user_id)
            .order_by(ChatThread.updated_at.desc())
            .limit(MAX_THREADS_PER_USER)
        )
        return list(result.scalars().all())

    async def rename_thread(self, thread: ChatThread, title: str) -> ChatThread:
        thread.title = title
        await self.db.flush()
        return thread

    async def delete_thread(self, thread: ChatThread) -> None:
        await self.db.delete(thread)
        await self.db.flush()

    async def touch_thread(self, thread: ChatThread) -> None:
        """Update the thread's updated_at timestamp via SQL func.now()."""
        await self.db.execute(
            update(ChatThread).where(ChatThread.id == thread.id).values(updated_at=func.now())
        )
        await self.db.flush()

    # ── Messages ───────────────────────────────────────────

    async def add_message(self, thread_id: uuid.UUID, role: str, content: str) -> ChatMessage:
        msg = ChatMessage(thread_id=thread_id, role=role, content=content)
        self.db.add(msg)
        await self.db.flush()
        return msg

    async def list_messages(self, thread_id: uuid.UUID, limit: int = 50) -> list[ChatMessage]:
        result = await self.db.execute(
            select(ChatMessage)
            .where(ChatMessage.thread_id == thread_id)
            .order_by(ChatMessage.created_at.asc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_last_message(self, thread_id: uuid.UUID) -> ChatMessage | None:
        result = await self.db.execute(
            select(ChatMessage)
            .where(ChatMessage.thread_id == thread_id)
            .order_by(ChatMessage.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()
