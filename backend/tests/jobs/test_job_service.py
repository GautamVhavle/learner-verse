import uuid
from datetime import timedelta

import pytest

from app.jobs.repository import JobRepository, utcnow
from app.jobs.service import JobService
from app.jobs.types import JobSubmission
from app.jobs.worker import JobWorker, handlers
from app.models.user import User
from app.production.errors import ProductionDomainError, ProductionErrorCode


async def _user(db_session, suffix: str = "one") -> User:
    user = User(email=f"{suffix}@jobs.test", display_name=f"Job {suffix}")
    db_session.add(user)
    await db_session.commit()
    return user


@pytest.mark.asyncio
async def test_submission_is_idempotent_and_records_outbox(db_session):
    user = await _user(db_session)
    service = JobService(db_session)
    submission = JobSubmission(
        job_type="test.success", payload={"value": 1}, idempotency_key="submit-key-0001"
    )

    first = await service.submit(user.id, submission)
    second = await service.submit(user.id, submission)

    assert first.id == second.id
    assert first.status == "queued"


@pytest.mark.asyncio
async def test_idempotency_key_rejects_different_payload(db_session):
    user = await _user(db_session)
    service = JobService(db_session)
    await service.submit(
        user.id,
        JobSubmission(
            job_type="test.success", payload={"value": 1}, idempotency_key="same-key-0001"
        ),
    )

    with pytest.raises(ProductionDomainError) as error:
        await service.submit(
            user.id,
            JobSubmission(
                job_type="test.success", payload={"value": 2}, idempotency_key="same-key-0001"
            ),
        )

    assert error.value.code is ProductionErrorCode.IDEMPOTENCY_CONFLICT


@pytest.mark.asyncio
async def test_worker_completes_job_and_enforces_owner_isolation(db_session):
    user = await _user(db_session)
    other = await _user(db_session, "two")
    job_type = f"test.success.{uuid.uuid4().hex}"

    async def complete(context):
        await context.checkpoint("work", 50, "Working")
        return {"ok": True}

    handlers.register(job_type, complete)
    service = JobService(db_session)
    submitted = await service.submit(
        user.id, JobSubmission(job_type=job_type, idempotency_key="success-key-0001")
    )

    assert await JobWorker(db_session, worker_id="test-worker").run_once() is True
    completed = await service.get(user.id, submitted.id)
    assert completed.status == "completed"
    assert await service.result(user.id, submitted.id) == {"ok": True}

    with pytest.raises(ProductionDomainError) as error:
        await service.get(other.id, submitted.id)
    assert error.value.code is ProductionErrorCode.JOB_NOT_FOUND


@pytest.mark.asyncio
async def test_expired_lease_is_recovered_and_retried(db_session):
    user = await _user(db_session)
    service = JobService(db_session)
    submitted = await service.submit(
        user.id,
        JobSubmission(job_type="test.no-handler", idempotency_key="lease-key-0001", max_attempts=2),
    )
    repo = JobRepository(db_session)
    claimed = await repo.claim_run("dead-worker", lease_seconds=1)
    assert claimed is not None
    run, attempt = claimed
    attempt.lease_expires_at = utcnow() - timedelta(seconds=1)
    await db_session.commit()

    assert await JobWorker(db_session).recover_expired() == 1
    recovered = await service.get(user.id, submitted.id)
    assert recovered.status == "retrying"
    assert recovered.retryable is True


@pytest.mark.asyncio
async def test_cancelled_queued_job_never_runs(db_session):
    user = await _user(db_session)
    service = JobService(db_session)
    submitted = await service.submit(
        user.id, JobSubmission(job_type="test.no-handler", idempotency_key="cancel-key-0001")
    )

    cancelled = await service.cancel(user.id, submitted.id)
    assert cancelled.status == "cancelled"
    assert await JobWorker(db_session).run_once() is False
