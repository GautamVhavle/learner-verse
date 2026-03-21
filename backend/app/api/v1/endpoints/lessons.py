"""API endpoints for lesson CRUD, reordering, movement, and reference links."""

import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.lesson import (
    LessonCreate,
    LessonMove,
    LessonResponse,
    LessonUpdate,
    ReferenceLinkCreate,
    ReferenceLinkResponse,
)
from app.schemas.section import ReorderRequest
from app.services.lesson_service import LessonService

router = APIRouter(prefix="/sections/{section_id}/lessons", tags=["lessons"])


def _service(db: AsyncSession) -> LessonService:
    return LessonService(db)


@router.post("", response_model=LessonResponse, status_code=status.HTTP_201_CREATED)
async def create_lesson(
    section_id: uuid.UUID,
    data: LessonCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _service(db).create_lesson(section_id, user.id, data)


@router.get("/{lesson_id}", response_model=LessonResponse)
async def get_lesson(
    section_id: uuid.UUID,
    lesson_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _service(db).get_lesson(lesson_id)


@router.put("/{lesson_id}", response_model=LessonResponse)
async def update_lesson(
    section_id: uuid.UUID,
    lesson_id: uuid.UUID,
    data: LessonUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _service(db).update_lesson(lesson_id, user.id, data)


@router.delete("/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lesson(
    section_id: uuid.UUID,
    lesson_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _service(db).delete_lesson(lesson_id, user.id)


@router.put("", response_model=list[LessonResponse])
async def reorder_lessons(
    section_id: uuid.UUID,
    data: ReorderRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Bulk reorder lessons within a section."""
    return await _service(db).reorder_lessons(section_id, user.id, data)


@router.post("/{lesson_id}/move", response_model=LessonResponse)
async def move_lesson(
    section_id: uuid.UUID,
    lesson_id: uuid.UUID,
    data: LessonMove,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Move a lesson to a different section."""
    return await _service(db).move_lesson(lesson_id, user.id, data)


@router.post("/{lesson_id}/duplicate", response_model=LessonResponse, status_code=status.HTTP_201_CREATED)
async def duplicate_lesson(
    section_id: uuid.UUID,
    lesson_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _service(db).duplicate_lesson(lesson_id, user.id)


# ── Reference Links ──────────────────────────────────────────
@router.post(
    "/{lesson_id}/references",
    response_model=ReferenceLinkResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_reference_link(
    section_id: uuid.UUID,
    lesson_id: uuid.UUID,
    data: ReferenceLinkCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _service(db).add_reference_link(lesson_id, user.id, data)


@router.delete(
    "/{lesson_id}/references/{link_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_reference_link(
    section_id: uuid.UUID,
    lesson_id: uuid.UUID,
    link_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _service(db).delete_reference_link(lesson_id, link_id, user.id)
