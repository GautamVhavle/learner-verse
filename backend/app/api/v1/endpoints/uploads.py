"""API endpoint for file uploads (thumbnails, avatars) backed by Supabase Storage."""

import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.core.storage import upload_file
from app.models.user import User

router = APIRouter(prefix="/uploads", tags=["uploads"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
THUMBNAILS_PREFIX = "thumbnails"
AVATARS_PREFIX = "avatars"
COVERS_PREFIX = "covers"


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


@router.post("/avatar")
async def upload_avatar(
    file: UploadFile,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Upload a profile avatar image and update the user profile.

    Accepts JPEG, PNG, WebP, or GIF images up to MAX_UPLOAD_SIZE_MB.
    Automatically sets the user's avatar_url after upload.
    Returns the public URL of the uploaded avatar.
    """
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type '{file.content_type}'. Allowed: JPEG, PNG, WebP, GIF.",
        )

    contents = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(contents) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size is {settings.MAX_UPLOAD_SIZE_MB} MB.",
        )

    ext = Path(file.filename).suffix.lower() if file.filename else ".jpg"
    if ext not in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
        ext = ".jpg"
    object_path = f"{AVATARS_PREFIX}/{uuid.uuid4().hex}{ext}"

    url = await upload_file(
        bucket=settings.SUPABASE_BUCKET,
        path=object_path,
        data=contents,
        content_type=file.content_type or "application/octet-stream",
    )

    # Update user's avatar_url
    user.avatar_url = url
    await db.commit()
    await db.refresh(user)

    return {"url": url}


@router.post("/cover")
async def upload_cover(
    file: UploadFile,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Upload a profile cover/banner image and update the user profile."""
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type '{file.content_type}'. Allowed: JPEG, PNG, WebP, GIF.",
        )

    contents = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(contents) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size is {settings.MAX_UPLOAD_SIZE_MB} MB.",
        )

    ext = Path(file.filename).suffix.lower() if file.filename else ".jpg"
    if ext not in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
        ext = ".jpg"
    object_path = f"{COVERS_PREFIX}/{uuid.uuid4().hex}{ext}"

    url = await upload_file(
        bucket=settings.SUPABASE_BUCKET,
        path=object_path,
        data=contents,
        content_type=file.content_type or "application/octet-stream",
    )

    user.cover_image_url = url
    await db.commit()
    await db.refresh(user)

    return {"url": url}
