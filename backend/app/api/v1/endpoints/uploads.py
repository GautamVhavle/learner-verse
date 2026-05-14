"""API endpoint for file uploads (thumbnails, avatars, covers) backed by Supabase Storage."""

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
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
THUMBNAILS_PREFIX = "thumbnails"
AVATARS_PREFIX = "avatars"
COVERS_PREFIX = "covers"

# Magic bytes for image format detection (independent of client Content-Type)
_MAGIC_BYTES = {
    b"\xff\xd8\xff": "image/jpeg",
    b"\x89PNG\r\n\x1a\n": "image/png",
    b"RIFF": "image/webp",  # WebP starts with RIFF....WEBP
    b"GIF87a": "image/gif",
    b"GIF89a": "image/gif",
}


def _detect_image_type(data: bytes) -> str | None:
    """Detect image type from magic bytes, ignoring client-supplied Content-Type."""
    for magic, mime in _MAGIC_BYTES.items():
        if data[: len(magic)] == magic:
            # Extra check for WebP: bytes 8-12 must be "WEBP"
            if mime == "image/webp" and data[8:12] != b"WEBP":
                continue
            return mime
    return None


async def _validate_and_upload(file: UploadFile, prefix: str) -> str:
    """Validate image type/size and upload to Supabase Storage. Returns the public URL."""
    contents = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(contents) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size is {settings.MAX_UPLOAD_SIZE_MB} MB.",
        )

    # Verify actual file content, not just client-supplied Content-Type
    detected_type = _detect_image_type(contents)
    if detected_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Allowed: JPEG, PNG, WebP, GIF.",
        )

    ext = Path(file.filename).suffix.lower() if file.filename else ".jpg"
    if ext not in ALLOWED_EXTENSIONS:
        ext = ".jpg"
    object_path = f"{prefix}/{uuid.uuid4().hex}{ext}"

    return await upload_file(
        bucket=settings.SUPABASE_BUCKET,
        path=object_path,
        data=contents,
        content_type=detected_type,
    )


@router.post("/thumbnail")
async def upload_thumbnail(
    file: UploadFile,
    _user: User = Depends(get_current_user),
) -> dict[str, str]:
    """Upload a course thumbnail image to Supabase Storage."""
    url = await _validate_and_upload(file, THUMBNAILS_PREFIX)
    return {"url": url}


@router.post("/avatar")
async def upload_avatar(
    file: UploadFile,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Upload a profile avatar image and update the user profile."""
    url = await _validate_and_upload(file, AVATARS_PREFIX)
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
    url = await _validate_and_upload(file, COVERS_PREFIX)
    user.cover_image_url = url
    await db.commit()
    await db.refresh(user)
    return {"url": url}
