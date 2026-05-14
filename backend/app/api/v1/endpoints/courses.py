"""API endpoints for course CRUD and lifecycle management."""

import uuid

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.course import (
    CourseCreate,
    CourseListResponse,
    CourseResponse,
    CourseUpdate,
    StatusUpdateRequest,
    StatusUpdateResponse,
    ValidationError,
)
from app.services.course_service import CourseService

router = APIRouter(prefix="/courses", tags=["courses"])


def _service(db: AsyncSession) -> CourseService:
    return CourseService(db)


@router.post("", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
async def create_course(
    data: CourseCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new course."""
    return await _service(db).create_course(user.id, data)


@router.get("", response_model=CourseListResponse)
async def list_courses(
    status_filter: str | None = Query(None, alias="status", pattern=r"^(draft|ready)$"),
    search: str | None = Query(None, max_length=200),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all active courses for the current user."""
    return await _service(db).list_courses(user.id, status_filter=status_filter, search=search)


@router.get("/trash", response_model=CourseListResponse)
async def list_trash(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List soft-deleted courses (trash)."""
    return await _service(db).list_courses(user.id, is_deleted=True)


@router.get("/{course_id}", response_model=CourseResponse)
async def get_course(
    course_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single course by ID."""
    return await _service(db).get_course(course_id, user.id)


@router.put("/{course_id}", response_model=CourseResponse)
async def update_course(
    course_id: uuid.UUID,
    data: CourseUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a course."""
    return await _service(db).update_course(course_id, user.id, data)


@router.delete("/{course_id}", response_model=CourseResponse)
async def soft_delete_course(
    course_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete a course (move to trash)."""
    return await _service(db).soft_delete(course_id, user.id)


@router.post("/{course_id}/restore", response_model=CourseResponse)
async def restore_course(
    course_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Restore a soft-deleted course from trash."""
    return await _service(db).restore(course_id, user.id)


@router.delete("/{course_id}/permanent", status_code=status.HTTP_204_NO_CONTENT)
async def permanent_delete_course(
    course_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Permanently delete a course. Course must be in trash first."""
    await _service(db).permanent_delete(course_id, user.id)


@router.post(
    "/{course_id}/duplicate", response_model=CourseResponse, status_code=status.HTTP_201_CREATED
)
async def duplicate_course(
    course_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Duplicate a course with all its tags."""
    return await _service(db).duplicate(course_id, user.id)


@router.put("/{course_id}/status", response_model=StatusUpdateResponse)
async def update_course_status(
    course_id: uuid.UUID,
    data: StatusUpdateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update course status with validation. Returns errors if setting to Ready and course is invalid."""
    return await _service(db).update_status(course_id, user.id, data.status)


@router.get("/{course_id}/validate", response_model=list[ValidationError])
async def validate_course(
    course_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Run content validation on a course and return the list of issues."""
    return await _service(db).validate_course(course_id, user.id)


@router.get("/{course_id}/export")
async def export_course(
    course_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Export the full course structure as a downloadable JSON file."""
    data = await _service(db).export_course(course_id, user.id)
    # Sanitize the title for use as a filename
    safe_title = "".join(c if c.isalnum() or c in " -_" else "" for c in data["course"]["title"])
    safe_title = safe_title.strip().replace(" ", "_") or "course"
    return JSONResponse(
        content=data,
        headers={"Content-Disposition": f'attachment; filename="{safe_title}_export.json"'},
    )


@router.post("/{course_id}/import", response_model=CourseResponse)
async def import_course(
    course_id: uuid.UUID,
    payload: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Import a course JSON, replacing all existing content (sections, lessons, etc.)."""
    import json

    # Enforce payload size limit to prevent DoS (10.1)
    payload_size = len(json.dumps(payload))
    if payload_size > 5_000_000:  # 5 MB
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Import payload too large. Maximum 5 MB.",
        )

    # Enforce section/lesson count limits
    sections = payload.get("sections", [])
    if isinstance(sections, list):
        if len(sections) > 50:
            from fastapi import HTTPException, status

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Too many sections. Maximum 50.",
            )
        total_lessons = sum(len(s.get("lessons", [])) for s in sections if isinstance(s, dict))
        if total_lessons > 500:
            from fastapi import HTTPException, status

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Too many lessons. Maximum 500.",
            )

    return await _service(db).import_course(course_id, user.id, payload)
