"""API endpoints for course CRUD, lifecycle management, and import/export."""

import json
import uuid

from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from fastapi.responses import JSONResponse
from pydantic import ValidationError
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
)
from app.schemas.export import CourseExportData
from app.services.course_service import CourseService
from app.services.export_service import ExportImportService

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
    return await _service(db).list_courses(
        user.id, status_filter=status_filter, search=search
    )


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


@router.post("/{course_id}/duplicate", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
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


@router.get("/{course_id}/export")
async def export_course(
    course_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Export a course as a JSON file download."""
    service = ExportImportService(db)
    data = await service.export_course(course_id, user.id)
    # Sanitize title for filename
    safe_title = "".join(c if c.isalnum() or c in " -_" else "" for c in data.title)
    safe_title = safe_title.strip().replace(" ", "-")[:50] or "course"
    return JSONResponse(
        content=data.model_dump(),
        headers={
            "Content-Disposition": f'attachment; filename="{safe_title}.json"',
        },
    )


@router.post("/import", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
async def import_course(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Import a course from a JSON file upload."""
    data = await _parse_import_file(file)
    service = ExportImportService(db)
    return await service.import_course(user.id, data)


# ── Import Helpers ───────────────────────────────────────────────

_MAX_IMPORT_SIZE = 10 * 1024 * 1024  # 10 MB


async def _parse_import_file(file: UploadFile) -> CourseExportData:
    """Validate and parse an uploaded JSON course file.

    Checks filename extension, file size, JSON validity, and schema
    conformance. Returns a validated ``CourseExportData`` or raises
    an appropriate HTTP error response.
    """
    if not file.filename or not file.filename.endswith(".json"):
        raise _import_error("File must be a .json file.")

    content = await file.read()
    if len(content) > _MAX_IMPORT_SIZE:
        raise _import_error("File too large. Maximum 10 MB.")

    try:
        raw = json.loads(content)
    except json.JSONDecodeError:
        raise _import_error("Invalid JSON file.")

    try:
        return CourseExportData.model_validate(raw)
    except ValidationError as e:
        raise _import_error(f"Invalid course format: {e.error_count()} validation errors.")


def _import_error(detail: str):
    """Return an HTTPException for import validation failures."""
    from fastapi import HTTPException
    return HTTPException(status_code=400, detail=detail)
