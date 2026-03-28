"""Repository for course enrollment operations."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.course import Course
from app.models.enrollment import CourseEnrollment


async def enroll(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    course_id: uuid.UUID,
) -> CourseEnrollment:
    """Enroll a user in a course. Returns existing enrollment if already enrolled."""
    result = await session.execute(
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
        enrolled_at=datetime.now(timezone.utc),
    )
    session.add(enrollment)
    await session.flush()
    return enrollment


async def unenroll(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    course_id: uuid.UUID,
) -> bool:
    """Remove a user's enrollment. Returns True if deleted, False if not found."""
    result = await session.execute(
        delete(CourseEnrollment)
        .where(
            CourseEnrollment.user_id == user_id,
            CourseEnrollment.course_id == course_id,
        )
        .returning(CourseEnrollment.id)
    )
    return result.rowcount > 0


async def get_enrolled_courses(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
) -> list[Course]:
    """Return all non-deleted courses the user is enrolled in, newest enrollment first."""
    result = await session.execute(
        select(Course)
        .options(selectinload(Course.tags))
        .join(CourseEnrollment, CourseEnrollment.course_id == Course.id)
        .where(
            CourseEnrollment.user_id == user_id,
            Course.is_deleted.is_(False),
        )
        .order_by(CourseEnrollment.enrolled_at.desc())
    )
    return list(result.scalars().all())


async def get_enrollment_ids(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
) -> set[uuid.UUID]:
    """Return the set of course IDs the user is enrolled in."""
    result = await session.execute(
        select(CourseEnrollment.course_id).where(
            CourseEnrollment.user_id == user_id,
        )
    )
    return set(result.scalars().all())


async def is_enrolled(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    course_id: uuid.UUID,
) -> bool:
    """Check whether a user is enrolled in a given course."""
    result = await session.execute(
        select(CourseEnrollment.id).where(
            CourseEnrollment.user_id == user_id,
            CourseEnrollment.course_id == course_id,
        )
    )
    return result.scalar_one_or_none() is not None


async def get_enrollment_count(
    session: AsyncSession,
    *,
    course_id: uuid.UUID,
) -> int:
    """Return the number of enrollments for a course."""
    result = await session.execute(
        select(func.count(CourseEnrollment.id)).where(
            CourseEnrollment.course_id == course_id,
        )
    )
    return result.scalar_one()


async def get_enrollment_counts_batch(
    session: AsyncSession,
    *,
    course_ids: list[uuid.UUID],
) -> dict[uuid.UUID, int]:
    """Return {course_id: enrollment_count} for multiple courses."""
    if not course_ids:
        return {}
    result = await session.execute(
        select(
            CourseEnrollment.course_id,
            func.count(CourseEnrollment.id),
        )
        .where(CourseEnrollment.course_id.in_(course_ids))
        .group_by(CourseEnrollment.course_id)
    )
    return {row[0]: row[1] for row in result.all()}
