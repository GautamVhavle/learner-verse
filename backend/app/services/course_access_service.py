"""Shared authorization rules for learner-facing course content."""

from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.course import Course
from app.models.enrollment import CourseEnrollment


async def ensure_learning_access(
    db: AsyncSession, course_id: uuid.UUID, user_id: uuid.UUID
) -> None:
    """Allow a non-deleted owner or an enrollee of a public, ready course.

    Keeping this rule in one place prevents progress, notes, lessons, and
    quizzes from drifting into different privacy semantics.
    """
    course = (
        await db.execute(
            select(Course.user_id, Course.status, Course.is_public).where(
                Course.id == course_id,
                Course.is_deleted.is_(False),
            )
        )
    ).one_or_none()
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")

    owner_id, course_status, is_public = course
    if owner_id == user_id:
        return
    if course_status != "ready" or not is_public:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Course is unavailable.")

    enrollment_id = await db.scalar(
        select(CourseEnrollment.id).where(
            CourseEnrollment.user_id == user_id,
            CourseEnrollment.course_id == course_id,
        )
    )
    if enrollment_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enrolled.")
