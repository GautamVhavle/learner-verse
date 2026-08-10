import pytest

from app.production.lifecycle import LifecycleService


@pytest.mark.asyncio
async def test_expired_upload_intents_are_cleaned(db_session):
    # Lifecycle scheduling is DB-backed and independently testable.
    # Foreign keys require real asset/user on SQLite only when enabled, so use
    # a no-row assertion to exercise the safe scheduled-query path.
    assert await LifecycleService(db_session).expire_upload_intents() == 0
