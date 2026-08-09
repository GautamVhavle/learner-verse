"""Idempotent Phase 6 course assembly and QA gates, callable from jobs or REST."""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.course import Course
from app.models.lesson import Lesson
from app.models.production import ProductionProject, ProductionSpecVersion
from app.models.production_assets import ProductionQaReport
from app.models.section import Section
from app.production.schemas.v1.course_build import CourseBuildSpec


class QaGateError(ValueError):
    pass


class ProductionPipeline:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def assemble(
        self,
        *,
        user_id: uuid.UUID,
        project_id: uuid.UUID,
        spec_version_id: uuid.UUID,
        qa_report: dict,
        approve_review: bool = False,
    ) -> Course:
        """Create/refresh the learner-facing draft exactly once after QA.

        Physical renderer/ffprobe workers write QA results before this method.
        Keeping the transaction here makes successful render work reusable even
        if publication is delayed for human review.
        """
        if qa_report.get("status") != "passed":
            raise QaGateError("QA must pass before course assembly")
        spec_row = await self.db.get(ProductionSpecVersion, spec_version_id)
        project = await self.db.get(ProductionProject, project_id)
        if not spec_row or not project or project.user_id != user_id:
            raise QaGateError("production project/spec not found")
        spec = CourseBuildSpec.model_validate(spec_row.document)
        course = await self.db.get(Course, project.course_id) if project.course_id else None
        if course is None:
            course = Course(
                user_id=user_id,
                title=spec.course.title,
                description=spec.course.description,
                category=spec.course.category,
                status="draft",
                is_public=False,
            )
            self.db.add(course)
            await self.db.flush()
            project.course_id = course.id
            for section_index, section_spec in enumerate(spec.sections):
                section = Section(
                    course_id=course.id, title=section_spec.title, position=section_index
                )
                self.db.add(section)
                await self.db.flush()
                for lesson_index, lesson_spec in enumerate(section_spec.lessons):
                    duration = (
                        qa_report.get("lessons", {}).get(lesson_spec.id, {}).get("duration_seconds")
                    )
                    self.db.add(
                        Lesson(
                            section_id=section.id,
                            title=lesson_spec.title,
                            lesson_type="video",
                            position=lesson_index,
                            video_source="generated",
                            video_duration_seconds=duration,
                            video_provenance={"spec_checksum": spec_row.checksum, "qa": "passed"},
                        )
                    )
        course.status = "ready"
        if not spec.policies.require_human_review_before_publish or approve_review:
            course.is_public = bool(spec.course.publish_when_complete)
        project.state = (
            "ready_for_review"
            if spec.policies.require_human_review_before_publish and not approve_review
            else "ready"
        )
        await self.db.flush()
        return course

    async def record_qa(
        self, user_id: uuid.UUID, run_id: uuid.UUID, report: dict
    ) -> ProductionQaReport:
        status = report.get("status", "failed")
        row = await self.db.scalar(
            select(ProductionQaReport).where(ProductionQaReport.run_id == run_id)
        )
        if row is None:
            row = ProductionQaReport(user_id=user_id, run_id=run_id, status=status, report=report)
            self.db.add(row)
        else:
            row.status, row.report = status, report
        await self.db.flush()
        return row

    @staticmethod
    def validate_qa_report(report: dict) -> None:
        required = {"readable", "video_codec", "audio_codec", "captions", "checksum"}
        failures = [key for key in required if not report.get(key)]
        if failures:
            raise QaGateError(f"QA failed: {', '.join(sorted(failures))}")
