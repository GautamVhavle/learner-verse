"""Dramatiq/Redis integration for the durable database-backed job engine."""

from __future__ import annotations

import asyncio

import dramatiq
from dramatiq.brokers.redis import RedisBroker

from app.core.config import settings
from app.core.database import async_session_maker
from app.jobs.worker import JobWorker

broker = RedisBroker(url=settings.JOBS_REDIS_URL, namespace="learnerverse")
dramatiq.set_broker(broker)


@dramatiq.actor(
    queue_name=settings.JOBS_QUEUE_NAME,
    max_retries=0,
    time_limit=600_000,
)
def process_run(run_id: str) -> None:
    """Run one database claim cycle.

    The message is only a wake-up signal.  The worker claims from the database
    so broker redelivery or duplicated outbox dispatch cannot execute a run
    twice concurrently.
    """

    async def _process() -> None:
        async with async_session_maker() as db:
            worker = JobWorker(db, lease_seconds=settings.JOBS_LEASE_SECONDS)
            await worker.recover_expired()
            await worker.run_once()

    asyncio.run(_process())


class DramatiqQueueDispatcher:
    async def enqueue(self, run_id: str) -> None:
        process_run.send(run_id)
