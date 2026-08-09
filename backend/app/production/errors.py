"""Stable, transport-neutral errors for course production."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any


class ProductionErrorCode(StrEnum):
    INVALID_SPEC = "invalid_spec"
    UNSUPPORTED_SCHEMA_VERSION = "unsupported_schema_version"
    IDEMPOTENCY_CONFLICT = "idempotency_conflict"
    JOB_NOT_FOUND = "job_not_found"
    INVALID_JOB_STATE = "invalid_job_state"
    JOB_CANCELLED = "job_cancelled"
    JOB_LEASE_LOST = "job_lease_lost"
    RETRY_NOT_ALLOWED = "retry_not_allowed"


@dataclass(slots=True)
class ProductionDomainError(Exception):
    """A safe error that API/MCP adapters can expose to callers."""

    code: ProductionErrorCode
    message: str
    retryable: bool = False
    field_path: str | None = None
    details: dict[str, Any] = field(default_factory=dict)
    suggested_fix: str | None = None

    def __str__(self) -> str:
        return self.message
