"""API endpoints for study state and study notes."""

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.study_note import StudyNoteResponse, StudyNoteUpdate
from app.schemas.study_state import StudyStateResponse, StudyStateUpdate
from app.services.study_service import StudyService

router = APIRouter(prefix="/study", tags=["study"])


def _service(db: AsyncSession) -> StudyService:
    return StudyService(db)


# ── Study State ──────────────────────────────────────────────

@router.get(
    "/courses/{course_id}/state",
    response_model=StudyStateResponse | None,
)
async def get_study_state(
    course_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _service(db).get_study_state(course_id, user.id)


@router.put(
    "/courses/{course_id}/state",
    response_model=StudyStateResponse,
)
async def update_study_state(
    course_id: uuid.UUID,
    data: StudyStateUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _service(db).update_study_state(course_id, user.id, data)


# ── Study Notes ──────────────────────────────────────────────

@router.get(
    "/lessons/{lesson_id}/notes",
    response_model=StudyNoteResponse,
)
async def get_study_note(
    lesson_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _service(db).get_study_note(lesson_id, user.id)


@router.put(
    "/lessons/{lesson_id}/notes",
    response_model=StudyNoteResponse,
)
async def update_study_note(
    lesson_id: uuid.UUID,
    data: StudyNoteUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _service(db).update_study_note(lesson_id, user.id, data)
