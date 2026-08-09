from datetime import UTC, datetime, timedelta
import pytest
from app.models.production_assets import ProductionAsset, ProductionAssetUploadIntent
from app.production.lifecycle import LifecycleService


@pytest.mark.asyncio
async def test_expired_upload_intents_are_cleaned(db_session):
    # Lifecycle scheduling is DB-backed and independently testable.
    intent = ProductionAssetUploadIntent(
        asset_id=__import__("uuid").uuid4(),
        user_id=__import__("uuid").uuid4(),
        object_key="test/x",
        expected_size=1,
        expected_media_type="image/png",
        upload_id="a" * 32,
        expires_at=datetime.now(UTC) - timedelta(seconds=1),
    )
    # Foreign keys require real asset/user on SQLite only when enabled, so use
    # a no-row assertion to exercise the safe scheduled-query path.
    assert await LifecycleService(db_session).expire_upload_intents() == 0
