"""Course enrollment endpoints.

Provides enroll/unenroll operations and the list of courses a user
has explicitly enrolled in (used by the learner dashboard).
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.course import Course
from app.models.user import User
from app.repositories import enrollment_repo
from app.schemas.course import CourseListResponse
from app.schemas.enrollment import EnrollmentResponse
from app.services.course_service import CourseService

router = APIRouter(prefix="/enrollments", tags=["enrollments"])


def _svc(db: AsyncSession) -> CourseService:
    return CourseService(db)


@router.get("", response_model=CourseListResponse)
async def get_enrolled_courses(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return all courses the current user is enrolled in."""
    return await _svc(db).list_enrolled_courses(current_user.id)


@router.post(
    "/{course_id}",
    response_model=EnrollmentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def enroll_in_course(
    course_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Enroll the current user in a published course."""
    result = await db.execute(
        select(Course).where(
            Course.id == course_id,
            Course.is_deleted.is_(False),
        )
    )
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")
    if course.status != "ready":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only published courses can be enrolled in.",
        )

    enrollment = await enrollment_repo.enroll(
        db, user_id=current_user.id, course_id=course_id
    )
    await db.commit()
    return EnrollmentResponse(
        course_id=enrollment.course_id,
        enrolled_at=enrollment.enrolled_at,
    )


@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unenroll_from_course(
    course_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove the current user's enrollment from a course."""
    await enrollment_repo.unenroll(
        db, user_id=current_user.id, course_id=course_id
    )
    await db.commit()
