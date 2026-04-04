"""API endpoints for section CRUD, reordering, duplication, and AI organization."""

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
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
from app.services.organize_service import OrganizeService

router = APIRouter(prefix="/courses/{course_id}/sections", tags=["sections"])


def _service(db: AsyncSession) -> SectionService:
    return SectionService(db)


@router.post("", response_model=SectionResponse, status_code=status.HTTP_201_CREATED)
async def create_section(
    course_id: uuid.UUID,
    data: SectionCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _service(db).create_section(course_id, user.id, data)


@router.post("/organize", response_model=list[SectionResponse])
async def organize_sections(
    course_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Use AI to reorganize lessons into logical sections."""
    logger = logging.getLogger(__name__)
    await _service(db)._verify_course(course_id, user.id)
    service = OrganizeService(db)
    try:
        return await service.organize_course(course_id, user.id)
    except ValueError as exc:
        logger.error("Organize failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )


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
