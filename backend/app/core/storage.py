"""File storage abstraction.

Uses Supabase Storage when configured, otherwise falls back to local
disk storage under the configured ``UPLOAD_DIR``.  The local fallback
keeps single-user / self-hosted setups working without an external
storage provider.
"""

import logging
from pathlib import Path

import httpx

from app.core.config import settings

_logger = logging.getLogger(__name__)

# ── Helpers ────────────────────────────────────────────────────────────────


def _use_local_storage() -> bool:
    """Return True when Supabase credentials are missing."""
    return not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY


def _headers() -> dict[str, str]:
    """Authorization headers for the Supabase Storage REST API."""
    return {
        "apikey": settings.SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
    }


def _storage_url(path: str = "") -> str:
    """Build the base Supabase Storage API URL."""
    return f"{settings.SUPABASE_URL}/storage/v1{path}"


# ── Local-disk helpers ─────────────────────────────────────────────────────


def _local_dir(bucket: str) -> Path:
    """Return (and create) the local directory for *bucket*."""
    base = Path(settings.UPLOAD_DIR) / bucket
    base.mkdir(parents=True, exist_ok=True)
    return base


async def _local_upload(bucket: str, path: str, data: bytes) -> str:
    """Write *data* to the local file-system and return a relative URL."""
    dest = _local_dir(bucket) / path
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
    return local_public_url(bucket, path)


def local_public_url(bucket: str, path: str) -> str:
    """Return the backend-relative URL for a locally stored file."""
    return f"/uploads/{bucket}/{path}"


# ── Public API ─────────────────────────────────────────────────────────────


async def upload_file(
    bucket: str,
    path: str,
    data: bytes,
    content_type: str,
) -> str:
    """Upload a file and return its public URL.

    Uses Supabase Storage when credentials are present, otherwise
    writes to local disk under ``UPLOAD_DIR``.
    """
    if _use_local_storage():
        _logger.debug("Supabase not configured - saving to local disk: %s/%s", bucket, path)
        return await _local_upload(bucket, path, data)

    url = _storage_url(f"/object/{bucket}/{path}")
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            url,
            headers={**_headers(), "Content-Type": content_type},
            content=data,
        )
        resp.raise_for_status()
    return public_url(bucket, path)


def public_url(bucket: str, path: str) -> str:
    """Return the public URL for an object in a Supabase Storage bucket."""
    return f"{settings.SUPABASE_URL}/storage/v1/object/public/{bucket}/{path}"


async def ensure_bucket() -> None:
    """Create the storage bucket if it does not exist (idempotent).

    Silently skips when Supabase is not configured (local storage
    doesn't need a bucket).
    """
    if _use_local_storage():
        # Make sure the local upload directory exists.
        _local_dir(settings.SUPABASE_BUCKET)
        return

    url = _storage_url("/bucket")
    async with httpx.AsyncClient(timeout=15) as client:
        # Check if bucket already exists
        resp = await client.get(f"{url}/{settings.SUPABASE_BUCKET}", headers=_headers())
        if resp.status_code == 200:
            return  # bucket exists

        resp = await client.post(
            url,
            headers=_headers(),
            json={"id": settings.SUPABASE_BUCKET, "name": settings.SUPABASE_BUCKET, "public": True},
        )
        # 409 = already exists - that's fine
        if resp.status_code not in (200, 201, 409):
            resp.raise_for_status()
