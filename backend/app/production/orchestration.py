"""Transport-neutral submission and review operations for API and MCP."""

from __future__ import annotations

import uuid

from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.jobs.service import JobService
from app.jobs.types import JobSubmission
from app.models.production import ProductionProject, ProductionSpecVersion
from app.production.services.spec_service import ProductionSpecService


class BuildSubmissionResult(BaseModel):
    dry_run: bool
    project_id: uuid.UUID | None = None
    spec_version_id: uuid.UUID | None = None
    job_id: uuid.UUID | None = None
    estimated_cost: float
    estimated_duration_seconds: float
    warnings: list[str]
    next_actions: list[str]


class ProductionOrchestrator:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.specs = ProductionSpecService()

    async def submit(
        self, user_id: uuid.UUID, document: dict, *, idempotency_key: str, dry_run: bool = False
    ) -> BuildSubmissionResult:
        validation = self.specs.validate(document)
        if not validation.valid:
            raise ValueError("; ".join(issue.message for issue in validation.errors))
        cost, duration = validation.estimated_cost or 0, validation.estimated_duration_seconds or 0
        warnings = [item.message for item in validation.warnings]
        if dry_run:
            return BuildSubmissionResult(
                dry_run=True,
                estimated_cost=cost,
                estimated_duration_seconds=duration,
                warnings=warnings,
                next_actions=["Resolve required assets, then submit with dry_run=false."],
            )
        existing = await self.db.scalar(
            select(ProductionSpecVersion).where(
                ProductionSpecVersion.user_id == user_id,
                ProductionSpecVersion.checksum == validation.spec_checksum,
            )
        )
        if existing:
            project = await self.db.get(ProductionProject, existing.project_id)
        else:
            project = ProductionProject(user_id=user_id, title=document["course"]["title"])
            self.db.add(project)
            await self.db.flush()
            version = await self.db.scalar(
                select(func.coalesce(func.max(ProductionSpecVersion.version), 0)).where(
                    ProductionSpecVersion.project_id == project.id
                )
            )
            existing = ProductionSpecVersion(
                project_id=project.id,
                user_id=user_id,
                version=int(version) + 1,
                schema_version=document.get("schema_version", "1.0"),
                document=document,
                checksum=validation.spec_checksum or "",
                validation_report=validation.model_dump(mode="json"),
            )
            self.db.add(existing)
            await self.db.flush()
            project.active_spec_version_id = existing.id
        job = await JobService(self.db).submit(
            user_id,
            JobSubmission(
                job_type="course_build",
                payload={"spec_checksum": existing.checksum},
                idempotency_key=idempotency_key,
                project_id=project.id,
                spec_version_id=existing.id,
            ),
        )
        return BuildSubmissionResult(
            dry_run=False,
            project_id=project.id,
            spec_version_id=existing.id,
            job_id=job.id,
            estimated_cost=cost,
            estimated_duration_seconds=duration,
            warnings=warnings,
            next_actions=["Poll get_job until ready_for_review or completed."],
        )
