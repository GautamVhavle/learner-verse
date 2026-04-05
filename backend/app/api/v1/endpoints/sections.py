"""API endpoints for section CRUD, reordering, duplication, and AI organization."""

import asyncio
import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.section import (
    ReorderRequest,
    SectionBriefResponse,
    SectionCreate,
    SectionResponse,
    SectionUpdate,
)
from app.services.section_service import SectionService
from app.services.organize_service import (
    OrganizeService,
    TaskStatus,
    create_task,
    get_task,
    run_organize_in_background,
)

router = APIRouter(prefix="/courses/{course_id}/sections", tags=["sections"])


def _service(db: AsyncSession) -> SectionService:
    return SectionService(db)


# ── Organize response schemas ───────────────────────────────

class OrganizeStartResponse(BaseModel):
    task_id: str


class OrganizeStatusResponse(BaseModel):
    status: str  # "pending" | "done" | "failed"
    error: str | None = None


# ── Endpoints ───────────────────────────────────────────────

@router.post("", response_model=SectionResponse, status_code=status.HTTP_201_CREATED)
async def create_section(
    course_id: uuid.UUID,
    data: SectionCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _service(db).create_section(course_id, user.id, data)


@router.post(
    "/organize",
    response_model=OrganizeStartResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def organize_sections(
    course_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Kick off AI organization as a background task. Returns a task_id to poll."""
    logger = logging.getLogger(__name__)
    await _service(db)._verify_course(course_id, user.id)

    # Quick validation: ensure there are enough lessons
    service = OrganizeService(db)
    sections = await service.section_repo.list_by_course(course_id)
    total_lessons = sum(len(s.lessons) for s in sections)
    if total_lessons < 2:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Need at least 2 lessons to organize.",
        )

    task_id = create_task(str(course_id))
    logger.info("Organize task %s started for course %s", task_id, course_id)

    # Fire and forget — runs in the background event loop
    asyncio.create_task(
        run_organize_in_background(task_id, course_id, user.id)
    )

    return OrganizeStartResponse(task_id=task_id)


@router.get("/organize/{task_id}", response_model=OrganizeStatusResponse)
async def organize_status(
    course_id: uuid.UUID,
    task_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Poll the status of a background organize task."""
    task = get_task(task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found or expired.",
        )
    return OrganizeStatusResponse(status=task.status.value, error=task.error)


@router.get("", response_model=list[SectionResponse])
async def list_sections(
    course_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _service(db).list_sections(course_id, user.id)


@router.get("/{section_id}", response_model=SectionResponse)
async def get_section(
    course_id: uuid.UUID,
    section_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _service(db).get_section(section_id)


@router.put("/{section_id}", response_model=SectionResponse)
async def update_section(
    course_id: uuid.UUID,
    section_id: uuid.UUID,
    data: SectionUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _service(db).update_section(section_id, user.id, data)


@router.delete("/{section_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_section(
    course_id: uuid.UUID,
    section_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _service(db).delete_section(section_id, user.id)


@router.put("", response_model=list[SectionBriefResponse])
async def reorder_sections(
    course_id: uuid.UUID,
    data: ReorderRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Bulk reorder sections within a course."""
    return await _service(db).reorder_sections(course_id, user.id, data)


@router.post("/{section_id}/duplicate", response_model=SectionResponse, status_code=status.HTTP_201_CREATED)
async def duplicate_section(
    course_id: uuid.UUID,
    section_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _service(db).duplicate_section(section_id, user.id)
