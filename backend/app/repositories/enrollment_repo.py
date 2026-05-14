"""Repository for course enrollment operations."""

import uuid
from datetime import UTC, datetime

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.course import Course
from app.models.enrollment import CourseEnrollment


class EnrollmentRepository:
    """Data-access layer for course enrollments."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def enroll(self, user_id: uuid.UUID, course_id: uuid.UUID) -> CourseEnrollment:
        """Enroll a user in a course. Returns existing enrollment if already enrolled."""
        result = await self.db.execute(
            select(CourseEnrollment).where(
                CourseEnrollment.user_id == user_id,
                CourseEnrollment.course_id == course_id,
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            return existing

        enrollment = CourseEnrollment(
            user_id=user_id,
            course_id=course_id,
            enrolled_at=datetime.now(UTC),
        )
        self.db.add(enrollment)
        await self.db.flush()
        return enrollment

    async def unenroll(self, user_id: uuid.UUID, course_id: uuid.UUID) -> bool:
        """Remove a user's enrollment. Returns True if deleted, False if not found."""
        result = await self.db.execute(
            delete(CourseEnrollment).where(
                CourseEnrollment.user_id == user_id,
                CourseEnrollment.course_id == course_id,
            )
        )
        return result.rowcount > 0

    async def get_enrolled_courses(self, user_id: uuid.UUID) -> list[Course]:
        """Return all published, non-deleted courses the user is enrolled in, newest first."""
        result = await self.db.execute(
            select(Course)
            .options(selectinload(Course.tags))
            .join(CourseEnrollment, CourseEnrollment.course_id == Course.id)
            .where(
                CourseEnrollment.user_id == user_id,
                Course.is_deleted.is_(False),
                Course.status == "ready",
            )
            .order_by(CourseEnrollment.enrolled_at.desc())
        )
        return list(result.scalars().all())

    async def get_enrollment_ids(self, user_id: uuid.UUID) -> set[uuid.UUID]:
        """Return the set of course IDs the user is enrolled in."""
        result = await self.db.execute(
            select(CourseEnrollment.course_id).where(
                CourseEnrollment.user_id == user_id,
            )
        )
        return set(result.scalars().all())

    async def is_enrolled(self, user_id: uuid.UUID, course_id: uuid.UUID) -> bool:
        """Check whether a user is enrolled in a given course."""
        result = await self.db.execute(
            select(CourseEnrollment.id).where(
                CourseEnrollment.user_id == user_id,
                CourseEnrollment.course_id == course_id,
            )
        )
        return result.scalar_one_or_none() is not None

    async def get_enrollment(
        self, user_id: uuid.UUID, course_id: uuid.UUID
    ) -> CourseEnrollment | None:
        """Return the enrollment row for a user+course, or None."""
        result = await self.db.execute(
            select(CourseEnrollment).where(
                CourseEnrollment.user_id == user_id,
                CourseEnrollment.course_id == course_id,
            )
        )
        return result.scalar_one_or_none()

    async def mark_completed(
        self, user_id: uuid.UUID, course_id: uuid.UUID, completed_at: datetime
    ) -> None:
        """Stamp completed_at on an enrollment (idempotent — only sets if NULL)."""
        enrollment = await self.get_enrollment(user_id, course_id)
        if enrollment and enrollment.completed_at is None:
            enrollment.completed_at = completed_at

    async def get_enrollment_count(self, course_id: uuid.UUID) -> int:
        """Return the number of enrollments for a course."""
        result = await self.db.execute(
            select(func.count(CourseEnrollment.id)).where(
                CourseEnrollment.course_id == course_id,
            )
        )
        return result.scalar_one()

    async def get_all_enrollments(self, user_id: uuid.UUID) -> list[CourseEnrollment]:
        """Return all enrollment records for a user."""
        result = await self.db.execute(
            select(CourseEnrollment).where(CourseEnrollment.user_id == user_id)
        )
        return list(result.scalars().all())

    async def get_enrollment_counts_batch(
        self, course_ids: list[uuid.UUID]
    ) -> dict[uuid.UUID, int]:
        """Return {course_id: enrollment_count} for multiple courses."""
        if not course_ids:
            return {}
        result = await self.db.execute(
            select(
                CourseEnrollment.course_id,
                func.count(CourseEnrollment.id),
            )
            .where(CourseEnrollment.course_id.in_(course_ids))
            .group_by(CourseEnrollment.course_id)
        )
        return {row[0]: row[1] for row in result.all()}
