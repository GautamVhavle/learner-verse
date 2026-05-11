"""Supabase Storage client.

Provides helpers for uploading files to and building public URLs
from a Supabase Storage bucket.
"""

import httpx

from app.core.config import settings


def _headers() -> dict[str, str]:
    """Authorization headers for the Supabase Storage REST API."""
    return {
        "apikey": settings.SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
    }


def _storage_url(path: str = "") -> str:
    """Build the base Supabase Storage API URL."""
    return f"{settings.SUPABASE_URL}/storage/v1{path}"


async def upload_file(
    bucket: str,
    path: str,
    data: bytes,
    content_type: str,
) -> str:
    """Upload a file to Supabase Storage and return its public URL."""
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
    """Create the storage bucket if it does not exist (idempotent)."""
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
