"""Asset intent lifecycle, byte-level verification, provenance, and reuse."""

from __future__ import annotations

import imghdr
import uuid
from collections.abc import AsyncIterable
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.production_assets import (
    ProductionAsset,
    ProductionAssetUploadIntent,
    ProductionAssetVersion,
)
from app.production.assets.storage import ObjectStore

ALLOWED_MEDIA_TYPES = {
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
    "audio/mpeg",
    "audio/wav",
    "audio/ogg",
    "video/mp4",
    "video/webm",
    "font/ttf",
    "font/otf",
}
_IMAGE_TYPES = {"png": "image/png", "jpeg": "image/jpeg", "webp": "image/webp", "gif": "image/gif"}


class AssetValidationError(ValueError):
    pass


def detected_media_type(header: bytes) -> str | None:
    detected = imghdr.what(None, header)
    if detected:
        return _IMAGE_TYPES.get(detected)
    if header.startswith(b"ID3") or header[:2] == b"\xff\xfb":
        return "audio/mpeg"
    if header.startswith(b"RIFF") and header[8:12] == b"WAVE":
        return "audio/wav"
    if header[4:8] == b"ftyp":
        return "video/mp4"
    if header.startswith(b"\x1aE\xdf\xa3"):
        return "video/webm"
    if header.startswith(b"\x00\x01\x00\x00") or header.startswith(b"OTTO"):
        return "font/ttf" if header.startswith(b"\x00") else "font/otf"
    return None


class AssetService:
    def __init__(
        self, session: AsyncSession, store: ObjectStore, *, max_bytes: int, intent_ttl_seconds: int
    ) -> None:
        self.session, self.store = session, store
        self.max_bytes, self.intent_ttl_seconds = max_bytes, intent_ttl_seconds

    async def create_upload_intent(
        self,
        *,
        user_id: uuid.UUID,
        display_name: str,
        kind: str,
        expected_size: int,
        expected_media_type: str,
        expected_checksum: str | None = None,
        tags: list[str] | None = None,
        license: str | None = None,
    ) -> ProductionAssetUploadIntent:
        if expected_size <= 0 or expected_size > self.max_bytes:
            raise AssetValidationError("invalid expected size")
        if expected_media_type not in ALLOWED_MEDIA_TYPES:
            raise AssetValidationError("unsupported media type")
        if expected_checksum and (
            len(expected_checksum) != 64
            or any(c not in "0123456789abcdef" for c in expected_checksum.lower())
        ):
            raise AssetValidationError("invalid SHA-256")
        asset = ProductionAsset(
            user_id=user_id,
            kind=kind,
            source="upload",
            state="pending_upload",
            display_name=display_name[:255],
            tags=tags or [],
            license=license,
        )
        self.session.add(asset)
        await self.session.flush()
        upload_id = uuid.uuid4().hex
        intent = ProductionAssetUploadIntent(
            asset_id=asset.id,
            user_id=user_id,
            object_key=f"assets/{user_id}/{asset.id}/v1",
            expected_size=expected_size,
            expected_media_type=expected_media_type,
            expected_checksum=expected_checksum,
            upload_id=upload_id,
            expires_at=datetime.now(UTC) + timedelta(seconds=self.intent_ttl_seconds),
        )
        self.session.add(intent)
        await self.session.flush()
        return intent

    async def complete_stream_upload(
        self,
        *,
        intent_id: uuid.UUID,
        user_id: uuid.UUID,
        data: AsyncIterable[bytes],
        provenance: dict | None = None,
    ) -> ProductionAssetVersion:
        intent = await self.session.scalar(
            select(ProductionAssetUploadIntent).where(
                ProductionAssetUploadIntent.id == intent_id,
                ProductionAssetUploadIntent.user_id == user_id,
            )
        )
        if not intent or intent.status != "open" or intent.expires_at <= datetime.now(UTC):
            raise AssetValidationError("upload intent is unavailable")
        # Capture only a small prefix while streaming. ObjectStore never loads a
        # whole user file into process memory.
        prefix = bytearray()

        async def checked() -> AsyncIterable[bytes]:
            async for chunk in data:
                if len(prefix) < 8192:
                    prefix.extend(chunk[: 8192 - len(prefix)])
                yield chunk

        byte_size, checksum = await self.store.put_stream(
            intent.object_key, checked(), max_bytes=min(self.max_bytes, intent.expected_size)
        )
        actual_type = detected_media_type(bytes(prefix))
        if (
            byte_size != intent.expected_size
            or checksum != (intent.expected_checksum or checksum)
            or actual_type != intent.expected_media_type
        ):
            await self.store.delete(intent.object_key)
            intent.status = "rejected"
            raise AssetValidationError("asset bytes do not match the upload intent")
        asset = await self.session.get(ProductionAsset, intent.asset_id)
        assert asset
        duplicate = await self.session.scalar(
            select(ProductionAssetVersion).where(
                ProductionAssetVersion.user_id == user_id,
                ProductionAssetVersion.checksum == checksum,
            )
        )
        if duplicate:
            await self.store.delete(intent.object_key)
            intent.status = "deduplicated"
            asset.state = "ready"
            asset.checksum = checksum
            return duplicate
        version = ProductionAssetVersion(
            asset_id=asset.id,
            user_id=user_id,
            version=1,
            object_key=intent.object_key,
            checksum=checksum,
            byte_size=byte_size,
            media_type=actual_type,
            provenance={
                **(provenance or {}),
                "source": "upload",
                "checksum": checksum,
                "captured_at": datetime.now(UTC).isoformat(),
            },
        )
        self.session.add(version)
        asset.state = "ready"
        asset.checksum = checksum
        intent.status = "completed"
        await self.session.flush()
        return version

    async def search_reusable(
        self,
        *,
        user_id: uuid.UUID,
        media_type: str | None = None,
        checksum: str | None = None,
        tags: list[str] | None = None,
    ) -> list[ProductionAsset]:
        statement = select(ProductionAsset).where(
            ProductionAsset.user_id == user_id,
            ProductionAsset.state == "ready",
            ProductionAsset.deleted_at.is_(None),
        )
        if checksum:
            statement = statement.where(ProductionAsset.checksum == checksum)
        assets = list((await self.session.scalars(statement)).all())
        if media_type:
            assets = [
                asset
                for asset in assets
                if asset.kind == media_type or asset.provenance.get("media_type") == media_type
            ]
        if tags:
            assets = [
                asset
                for asset in assets
                if set(tag.lower() for tag in tags).intersection(t.lower() for t in asset.tags)
            ]
        return assets
