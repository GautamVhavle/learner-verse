"""Lease-based worker engine used by Dramatiq actors and deterministic tests."""

from __future__ import annotations

import uuid
from collections.abc import Awaitable, Callable
from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

from app.jobs.repository import JobRepository, utcnow
from app.models.production import JobAttempt, OutboxMessage, ProductionRun

JobHandler = Callable[["JobExecutionContext"], Awaitable[dict]]


class JobHandlerRegistry:
    def __init__(self) -> None:
        self._handlers: dict[str, JobHandler] = {}

    def register(self, job_type: str, handler: JobHandler) -> None:
        if job_type in self._handlers:
            raise ValueError(f"Handler already registered for {job_type}")
        self._handlers[job_type] = handler

    def get(self, job_type: str) -> JobHandler | None:
        return self._handlers.get(job_type)


handlers = JobHandlerRegistry()


@dataclass(slots=True)
class JobExecutionContext:
    db: AsyncSession
    repo: JobRepository
    run: ProductionRun
    attempt: JobAttempt

    async def checkpoint(
        self, stage: str, progress: int, message: str, metadata: dict | None = None
    ) -> None:
        self.run.stage = stage
        self.run.progress = min(100, max(0, progress))
        self.repo.add_event(self.run, "checkpoint", message, stage=stage, metadata=metadata)
        await self.db.commit()

    async def cancellation_requested(self) -> bool:
        await self.db.refresh(self.run, attribute_names=["cancel_requested"])
        return self.run.cancel_requested


class JobWorker:
    def __init__(self, db: AsyncSession, worker_id: str | None = None, lease_seconds: int = 60):
        self.db = db
        self.repo = JobRepository(db)
        self.worker_id = worker_id or f"worker-{uuid.uuid4().hex[:12]}"
        self.lease_seconds = lease_seconds

    async def recover_expired(self) -> int:
        count = await self.repo.recover_expired_leases()
        await self.db.commit()
        return count

    async def run_once(self) -> bool:
        claimed = await self.repo.claim_run(self.worker_id, self.lease_seconds)
        await self.db.commit()
        if claimed is None:
            return False
        run, attempt = claimed
        await self._execute(run, attempt)
        return True

    async def _execute(self, run: ProductionRun, attempt: JobAttempt) -> None:
        handler = handlers.get(run.job_type)
        if handler is None:
            await self._finish_failure(
                run, attempt, "unknown_job_type", f"No handler for '{run.job_type}'.", False
            )
            return
        context = JobExecutionContext(self.db, self.repo, run, attempt)
        try:
            if await context.cancellation_requested():
                await self._finish_cancelled(run, attempt)
                return
            result = await handler(context)
            if await context.cancellation_requested():
                await self._finish_cancelled(run, attempt)
                return
            run.status = "completed"
            run.stage = "completed"
            run.progress = 100
            run.result = result
            run.retryable = False
            run.completed_at = utcnow()
            attempt.outcome = "completed"
            attempt.finished_at = utcnow()
            self.repo.add_event(run, "completed", "Job completed.", stage="completed")
            await self.db.commit()
        except Exception as exc:
            retryable = run.attempt_count < run.max_attempts
            await self._finish_failure(run, attempt, "handler_error", str(exc), retryable)

    async def _finish_cancelled(self, run: ProductionRun, attempt: JobAttempt) -> None:
        run.status = "cancelled"
        run.stage = "cancelled"
        run.completed_at = utcnow()
        attempt.outcome = "cancelled"
        attempt.finished_at = utcnow()
        self.repo.add_event(run, "cancelled", "Job cancelled by request.")
        await self.db.commit()

    async def _finish_failure(
        self,
        run: ProductionRun,
        attempt: JobAttempt,
        code: str,
        message: str,
        retryable: bool,
    ) -> None:
        attempt.outcome = "failed"
        attempt.error_message = message[:2_000]
        attempt.finished_at = utcnow()
        run.failure_code = code
        run.failure_message = message[:2_000]
        run.retryable = retryable
        if retryable:
            run.status = "retrying"
            run.stage = "retrying"
            run.scheduled_at = utcnow()
            self.repo.add_event(
                run, "retry_scheduled", "Job failed and will retry.", metadata={"code": code}
            )
            self.db.add(
                OutboxMessage(
                    run_id=run.id,
                    user_id=run.user_id,
                    message_type=f"retry:{run.attempt_count}",
                    payload={"run_id": str(run.id)},
                )
            )
        else:
            run.status = "failed"
            run.stage = "failed"
            run.completed_at = utcnow()
            self.repo.add_event(run, "failed", "Job failed.", metadata={"code": code})
        await self.db.commit()
