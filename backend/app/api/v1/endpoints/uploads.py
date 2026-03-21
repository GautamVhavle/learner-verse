"""API endpoint for file uploads (thumbnails) backed by Supabase Storage."""

import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status

from app.api.dependencies import get_current_user
from app.core.config import settings
from app.core.storage import upload_file
from app.models.user import User

router = APIRouter(prefix="/uploads", tags=["uploads"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
THUMBNAILS_PREFIX = "thumbnails"


@router.post("/thumbnail")
async def upload_thumbnail(
    file: UploadFile,
    _user: User = Depends(get_current_user),
) -> dict[str, str]:
    """Upload a course thumbnail image to Supabase Storage.

    Accepts JPEG, PNG, WebP, or GIF images up to MAX_UPLOAD_SIZE_MB.
    Returns the public URL of the uploaded object.
    """
    # Validate content type
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type '{file.content_type}'. Allowed: JPEG, PNG, WebP, GIF.",
        )

    # Read file and validate size
    contents = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(contents) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size is {settings.MAX_UPLOAD_SIZE_MB} MB.",
        )

    # Generate unique object key preserving extension
    ext = Path(file.filename).suffix.lower() if file.filename else ".jpg"
    if ext not in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
        ext = ".jpg"
    object_path = f"{THUMBNAILS_PREFIX}/{uuid.uuid4().hex}{ext}"

    # Upload to Supabase Storage
    url = await upload_file(
        bucket=settings.SUPABASE_BUCKET,
        path=object_path,
        data=contents,
        content_type=file.content_type or "application/octet-stream",
    )

    return {"url": url}
