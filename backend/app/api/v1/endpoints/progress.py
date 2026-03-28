"""API endpoints for lesson progress toggling and course progress queries."""

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.progress import (
    CourseProgressResponse,
    LessonProgressResponse,
    ProgressToggle,
)
from app.services.notification_service import NotificationService
from app.services.progress_service import ProgressService

router = APIRouter(prefix="/progress", tags=["progress"])


def _service(db: AsyncSession) -> ProgressService:
    return ProgressService(db)


@router.put(
    "/lessons/{lesson_id}",
    response_model=LessonProgressResponse,
)
async def toggle_lesson_progress(
    lesson_id: uuid.UUID,
    data: ProgressToggle,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await _service(db).toggle_lesson(lesson_id, user.id, data)

    # Check for course completion + streak milestones
    notif_svc = NotificationService(db)
    await notif_svc.check_course_completion_on_lesson_toggle(
        lesson_id, user.id, data.completed
    )

    return result


@router.get(
    "/courses/{course_id}",
    response_model=CourseProgressResponse,
)
async def get_course_progress(
    course_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _service(db).get_course_progress(course_id, user.id)
