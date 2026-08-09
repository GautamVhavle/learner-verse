"""Owner-safe database access for durable jobs and their transactional outbox."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.production import (
    IdempotencyRecord,
    JobAttempt,
    JobEvent,
    OutboxMessage,
    ProductionRun,
)


def utcnow() -> datetime:
    return datetime.now(UTC)


class JobRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_for_owner(self, run_id: uuid.UUID, user_id: uuid.UUID) -> ProductionRun | None:
        result = await self.db.execute(
            select(ProductionRun).where(
                ProductionRun.id == run_id, ProductionRun.user_id == user_id
            )
        )
        return result.scalar_one_or_none()

    async def get(self, run_id: uuid.UUID) -> ProductionRun | None:
        result = await self.db.execute(select(ProductionRun).where(ProductionRun.id == run_id))
        return result.scalar_one_or_none()

    async def get_idempotency(
        self, user_id: uuid.UUID, operation: str, idempotency_key: str
    ) -> IdempotencyRecord | None:
        result = await self.db.execute(
            select(IdempotencyRecord).where(
                IdempotencyRecord.user_id == user_id,
                IdempotencyRecord.operation == operation,
                IdempotencyRecord.idempotency_key == idempotency_key,
            )
        )
        return result.scalar_one_or_none()

    def add_event(
        self,
        run: ProductionRun,
        event_type: str,
        message: str,
        *,
        stage: str | None = None,
        metadata: dict | None = None,
    ) -> JobEvent:
        event = JobEvent(
            run_id=run.id,
            user_id=run.user_id,
            event_type=event_type,
            stage=stage or run.stage,
            message=message,
            metadata_json=metadata or {},
        )
        self.db.add(event)
        return event

    async def list_events_for_owner(
        self, run_id: uuid.UUID, user_id: uuid.UUID, limit: int = 100
    ) -> list[JobEvent]:
        result = await self.db.execute(
            select(JobEvent)
            .where(JobEvent.run_id == run_id, JobEvent.user_id == user_id)
            .order_by(JobEvent.created_at.asc(), JobEvent.id.asc())
            .limit(limit)
        )
        return list(result.scalars())

    async def claim_run(
        self, worker_id: str, lease_seconds: int
    ) -> tuple[ProductionRun, JobAttempt] | None:
        """Atomically lease one runnable job.

        The conditional update keeps the operation safe on SQLite tests and on
        PostgreSQL.  Production PostgreSQL deployments may later add
        SKIP LOCKED as an optimization without changing the correctness model.
        """
        now = utcnow()
        candidate = (
            await self.db.execute(
                select(ProductionRun.id)
                .where(
                    ProductionRun.status.in_(("queued", "retrying")),
                    ProductionRun.scheduled_at <= now,
                    ProductionRun.cancel_requested.is_(False),
                )
                .order_by(ProductionRun.scheduled_at.asc(), ProductionRun.created_at.asc())
                .limit(1)
            )
        ).scalar_one_or_none()
        if candidate is None:
            return None

        claimed = await self.db.execute(
            update(ProductionRun)
            .where(
                ProductionRun.id == candidate,
                ProductionRun.status.in_(("queued", "retrying")),
                ProductionRun.cancel_requested.is_(False),
            )
            .values(
                status="running",
                stage="running",
                attempt_count=ProductionRun.attempt_count + 1,
                started_at=now,
            )
        )
        if claimed.rowcount != 1:
            return None
        run = await self.get(candidate)
        assert run is not None
        attempt = JobAttempt(
            run_id=run.id,
            attempt_number=run.attempt_count,
            worker_id=worker_id,
            lease_token=uuid.uuid4().hex,
            lease_expires_at=now + timedelta(seconds=lease_seconds),
        )
        self.db.add(attempt)
        self.add_event(run, "claimed", f"Claimed by worker {worker_id}.", stage="running")
        await self.db.flush()
        return run, attempt

    async def heartbeat(self, attempt: JobAttempt, lease_seconds: int) -> bool:
        now = utcnow()
        result = await self.db.execute(
            update(JobAttempt)
            .where(
                JobAttempt.id == attempt.id,
                JobAttempt.lease_token == attempt.lease_token,
                JobAttempt.finished_at.is_(None),
                JobAttempt.lease_expires_at > now,
            )
            .values(lease_expires_at=now + timedelta(seconds=lease_seconds))
        )
        return result.rowcount == 1

    async def recover_expired_leases(self) -> int:
        """Requeue jobs abandoned by a dead worker, respecting retry limits."""
        now = utcnow()
        result = await self.db.execute(
            select(JobAttempt, ProductionRun)
            .join(ProductionRun, ProductionRun.id == JobAttempt.run_id)
            .where(
                JobAttempt.finished_at.is_(None),
                JobAttempt.lease_expires_at < now,
                ProductionRun.status == "running",
            )
        )
        count = 0
        for attempt, run in result.all():
            attempt.finished_at = now
            attempt.outcome = "lease_expired"
            attempt.error_message = "Worker heartbeat expired."
            if run.cancel_requested:
                run.status = "cancelled"
                run.stage = "cancelled"
                run.completed_at = now
                self.add_event(run, "cancelled", "Cancelled after worker lease expired.")
            elif run.attempt_count >= run.max_attempts:
                run.status = "failed"
                run.stage = "failed"
                run.retryable = False
                run.failure_code = "lease_expired"
                run.failure_message = "Worker heartbeat expired and retry budget was exhausted."
                run.completed_at = now
                self.add_event(run, "failed", run.failure_message)
            else:
                run.status = "retrying"
                run.stage = "retrying"
                run.retryable = True
                run.scheduled_at = now
                self.add_event(run, "retry_scheduled", "Worker lease expired; run requeued.")
                self.db.add(
                    OutboxMessage(
                        run_id=run.id,
                        user_id=run.user_id,
                        message_type=f"retry:{run.attempt_count}",
                        payload={"run_id": str(run.id)},
                    )
                )
            count += 1
        return count

    async def claim_outbox(self, limit: int = 50) -> list[OutboxMessage]:
        now = utcnow()
        result = await self.db.execute(
            select(OutboxMessage)
            .where(OutboxMessage.status == "pending", OutboxMessage.available_at <= now)
            .order_by(OutboxMessage.created_at.asc())
            .limit(limit)
        )
        messages = list(result.scalars())
        for message in messages:
            message.status = "processing"
            message.dispatch_attempts += 1
        await self.db.flush()
        return messages
