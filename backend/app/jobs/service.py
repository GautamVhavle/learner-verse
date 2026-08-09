"""Transport-neutral durable job application service."""

from __future__ import annotations

import uuid
from datetime import timedelta

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.jobs.repository import JobRepository, utcnow
from app.jobs.types import JobSubmission, JobView
from app.models.production import IdempotencyRecord, OutboxMessage, ProductionRun
from app.production.canonical import checksum
from app.production.errors import ProductionDomainError, ProductionErrorCode

IDEMPOTENCY_TTL_DAYS = 7


class JobService:
    """Creates and controls jobs without coupling callers to a message broker."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = JobRepository(db)

    async def submit(self, user_id: uuid.UUID, submission: JobSubmission) -> JobView:
        operation = f"job.submit:{submission.job_type}"
        request_checksum = checksum(submission.model_dump(mode="json", exclude={"correlation_id"}))
        existing = await self.repo.get_idempotency(user_id, operation, submission.idempotency_key)
        if existing:
            if existing.request_checksum != request_checksum:
                raise ProductionDomainError(
                    ProductionErrorCode.IDEMPOTENCY_CONFLICT,
                    "This idempotency key was already used with a different request.",
                    field_path="/idempotency_key",
                    suggested_fix="Use a new idempotency key for a different request.",
                )
            return await self._view_from_idempotency(existing)

        correlation_id = submission.correlation_id or uuid.uuid4().hex
        run = ProductionRun(
            user_id=user_id,
            project_id=submission.project_id,
            spec_version_id=submission.spec_version_id,
            job_type=submission.job_type,
            payload=submission.payload,
            max_attempts=submission.max_attempts,
            correlation_id=correlation_id,
        )
        self.db.add(run)
        await self.db.flush()
        self.repo.add_event(run, "submitted", "Job submitted and queued.")
        response = {"run_id": str(run.id)}
        self.db.add(
            IdempotencyRecord(
                user_id=user_id,
                operation=operation,
                idempotency_key=submission.idempotency_key,
                request_checksum=request_checksum,
                response=response,
                expires_at=utcnow() + timedelta(days=IDEMPOTENCY_TTL_DAYS),
            )
        )
        self.db.add(
            OutboxMessage(
                run_id=run.id,
                user_id=user_id,
                payload={"run_id": str(run.id)},
            )
        )
        try:
            await self.db.commit()
        except IntegrityError:
            await self.db.rollback()
            existing = await self.repo.get_idempotency(
                user_id, operation, submission.idempotency_key
            )
            if existing and existing.request_checksum == request_checksum:
                return await self._view_from_idempotency(existing)
            raise
        return self.to_view(run)

    async def get(self, user_id: uuid.UUID, run_id: uuid.UUID) -> JobView:
        run = await self.repo.get_for_owner(run_id, user_id)
        if not run:
            raise ProductionDomainError(ProductionErrorCode.JOB_NOT_FOUND, "Job not found.")
        return self.to_view(run)

    async def cancel(self, user_id: uuid.UUID, run_id: uuid.UUID) -> JobView:
        run = await self._require_owner(user_id, run_id)
        if run.status in {"completed", "failed", "cancelled"}:
            return self.to_view(run)
        run.cancel_requested = True
        self.repo.add_event(run, "cancel_requested", "Cancellation requested.")
        if run.status in {"queued", "retrying"}:
            run.status = "cancelled"
            run.stage = "cancelled"
            run.completed_at = utcnow()
            self.repo.add_event(run, "cancelled", "Cancelled before worker execution.")
        await self.db.commit()
        return self.to_view(run)

    async def retry(self, user_id: uuid.UUID, run_id: uuid.UUID, idempotency_key: str) -> JobView:
        run = await self._require_owner(user_id, run_id)
        if run.status != "failed" or not run.retryable:
            raise ProductionDomainError(
                ProductionErrorCode.RETRY_NOT_ALLOWED,
                "This job is not in a retryable failed state.",
                suggested_fix="Inspect the failure and submit a corrected new job if required.",
            )
        submission = JobSubmission(
            job_type=run.job_type,
            payload=run.payload,
            idempotency_key=idempotency_key,
            project_id=run.project_id,
            spec_version_id=run.spec_version_id,
            max_attempts=run.max_attempts,
            correlation_id=run.correlation_id,
        )
        return await self.submit(user_id, submission)

    async def result(self, user_id: uuid.UUID, run_id: uuid.UUID) -> dict:
        run = await self._require_owner(user_id, run_id)
        if run.status != "completed":
            raise ProductionDomainError(
                ProductionErrorCode.INVALID_JOB_STATE,
                f"Job result is unavailable while status is '{run.status}'.",
                retryable=run.status in {"queued", "running", "retrying"},
            )
        return run.result or {}

    async def _require_owner(self, user_id: uuid.UUID, run_id: uuid.UUID) -> ProductionRun:
        run = await self.repo.get_for_owner(run_id, user_id)
        if not run:
            raise ProductionDomainError(ProductionErrorCode.JOB_NOT_FOUND, "Job not found.")
        return run

    async def _view_from_idempotency(self, record: IdempotencyRecord) -> JobView:
        run_id = uuid.UUID(record.response["run_id"])
        run = await self.repo.get_for_owner(run_id, record.user_id)
        if run is None:
            raise ProductionDomainError(
                ProductionErrorCode.JOB_NOT_FOUND, "Original job no longer exists."
            )
        return self.to_view(run)

    @staticmethod
    def to_view(run: ProductionRun) -> JobView:
        return JobView(
            id=run.id,
            job_type=run.job_type,
            status=run.status,
            stage=run.stage,
            progress=run.progress,
            cancel_requested=run.cancel_requested,
            retryable=run.retryable,
            attempt_count=run.attempt_count,
            max_attempts=run.max_attempts,
            correlation_id=run.correlation_id,
            scheduled_at=run.scheduled_at,
            started_at=run.started_at,
            completed_at=run.completed_at,
            result=run.result,
            failure_code=run.failure_code,
            failure_message=run.failure_message,
        )
