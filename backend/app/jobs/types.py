"""Shared durable-job request and response types."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class JobSubmission(BaseModel):
    model_config = ConfigDict(extra="forbid")

    job_type: str = Field(min_length=1, max_length=100)
    payload: dict = Field(default_factory=dict)
    idempotency_key: str = Field(min_length=8, max_length=128, pattern=r"^[A-Za-z0-9._:-]+$")
    project_id: uuid.UUID | None = None
    spec_version_id: uuid.UUID | None = None
    max_attempts: int = Field(default=3, ge=1, le=20)
    correlation_id: str | None = Field(default=None, min_length=8, max_length=64)


class JobView(BaseModel):
    id: uuid.UUID
    job_type: str
    status: str
    stage: str
    progress: int
    cancel_requested: bool
    retryable: bool
    attempt_count: int
    max_attempts: int
    correlation_id: str
    scheduled_at: datetime
    started_at: datetime | None
    completed_at: datetime | None
    result: dict | None
    failure_code: str | None
    failure_message: str | None
