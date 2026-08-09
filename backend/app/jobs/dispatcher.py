"""Transactional-outbox dispatchers.

The database is the source of truth.  Redis/Dramatiq delivery is deliberately
at-least-once; worker leases and idempotent handlers make duplicate messages
safe.
"""

from __future__ import annotations

from typing import Protocol

from sqlalchemy.ext.asyncio import AsyncSession

from app.jobs.repository import JobRepository, utcnow
from app.models.production import OutboxMessage


class QueueDispatcher(Protocol):
    async def enqueue(self, run_id: str) -> None: ...


class OutboxDispatcher:
    def __init__(self, db: AsyncSession, queue: QueueDispatcher):
        self.db = db
        self.repo = JobRepository(db)
        self.queue = queue

    async def dispatch_pending(self, limit: int = 50) -> int:
        messages = await self.repo.claim_outbox(limit)
        await self.db.commit()
        dispatched = 0
        for message in messages:
            try:
                await self.queue.enqueue(message.payload["run_id"])
                await self._mark_dispatched(message)
                dispatched += 1
            except Exception as exc:  # broker failures must leave an auditable retryable row
                await self._mark_pending(message, str(exc))
        return dispatched

    async def _mark_dispatched(self, message: OutboxMessage) -> None:
        message.status = "dispatched"
        message.dispatched_at = utcnow()
        await self.db.commit()

    async def _mark_pending(self, message: OutboxMessage, error: str) -> None:
        message.status = "pending"
        message.last_error = error[:500]
        await self.db.commit()
