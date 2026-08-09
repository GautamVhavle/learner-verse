"""Retention cleanup designed for a scheduled worker, not application startup."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.production_assets import ProductionAsset, ProductionAssetUploadIntent


class LifecycleService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def expire_upload_intents(self, now: datetime | None = None) -> int:
        now = now or datetime.now(UTC)
        rows = list(
            (
                await self.db.scalars(
                    select(ProductionAssetUploadIntent).where(
                        ProductionAssetUploadIntent.status == "open",
                        ProductionAssetUploadIntent.expires_at <= now,
                    )
                )
            ).all()
        )
        for row in rows:
            row.status = "expired"
        await self.db.commit()
        return len(rows)

    async def purge_soft_deleted_assets(
        self, retention_days: int, now: datetime | None = None
    ) -> list[str]:
        cutoff = (now or datetime.now(UTC)) - timedelta(days=retention_days)
        rows = list(
            (
                await self.db.scalars(
                    select(ProductionAsset).where(
                        ProductionAsset.deleted_at.is_not(None),
                        ProductionAsset.deleted_at <= cutoff,
                    )
                )
            ).all()
        )
        ids = [str(row.id) for row in rows]
        for row in rows:
            await self.db.delete(row)
        await self.db.commit()
        return ids
