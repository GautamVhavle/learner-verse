"""Tests for superadmin user-management actions."""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select

from app.core.config import settings
from app.models.user import User


@pytest.fixture(autouse=True)
def _superadmin_settings(monkeypatch):
    monkeypatch.setattr(settings, "SUPERADMIN_EMAILS", "local@learnerverse.dev")
    monkeypatch.setattr(settings, "PAYMENT_GATEWAY_ENABLED", True)


@pytest.mark.asyncio
async def test_superadmin_can_grant_and_revoke_manual_pro(client):
    me = await client.get("/api/v1/auth/me")
    assert me.status_code == 200
    user_id = me.json()["id"]
    assert me.json()["is_pro"] is False

    grant = await client.put(
        f"/api/v1/superadmin/users/{user_id}/pro",
        json={"action": "grant", "duration_days": 30, "note": "Support bypass."},
    )
    assert grant.status_code == 200
    grant_data = grant.json()
    assert grant_data["is_pro"] is True
    assert grant_data["pro_plan"] == "manual"
    assert grant_data["subscription_status"] == "manual_active"
    assert grant_data["pro_since"] is not None
    assert grant_data["pro_expires_at"] is not None

    me = await client.get("/api/v1/auth/me")
    assert me.json()["is_pro"] is True
    assert me.json()["pro_plan"] == "manual"
    assert me.json()["subscription_status"] == "manual_active"

    users = await client.get("/api/v1/superadmin/users")
    assert users.status_code == 200
    row = next(item for item in users.json()["items"] if item["id"] == user_id)
    assert row["is_pro"] is True
    assert row["pro_plan"] == "manual"
    assert row["subscription_status"] == "manual_active"

    revoke = await client.put(
        f"/api/v1/superadmin/users/{user_id}/pro",
        json={"action": "revoke", "note": "Manual test revoke."},
    )
    assert revoke.status_code == 200
    revoke_data = revoke.json()
    assert revoke_data["is_pro"] is False
    assert revoke_data["subscription_status"] == "manual_revoked"

    me = await client.get("/api/v1/auth/me")
    assert me.json()["is_pro"] is False
    assert me.json()["subscription_status"] == "manual_revoked"


@pytest.mark.asyncio
async def test_superadmin_can_grant_lifetime_manual_pro(client):
    me = await client.get("/api/v1/auth/me")
    user_id = me.json()["id"]

    response = await client.put(
        f"/api/v1/superadmin/users/{user_id}/pro",
        json={"action": "grant", "duration_days": None},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["is_pro"] is True
    assert data["pro_plan"] == "manual"
    assert data["subscription_status"] == "manual_active"
    assert data["pro_expires_at"] is None


@pytest.mark.asyncio
async def test_manual_pro_expiry_is_detected(client, db_session):
    me = await client.get("/api/v1/auth/me")
    user_id = me.json()["id"]

    grant = await client.put(
        f"/api/v1/superadmin/users/{user_id}/pro",
        json={"action": "grant", "duration_days": 1},
    )
    assert grant.status_code == 200
    assert grant.json()["is_pro"] is True

    result = await db_session.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one()
    user.pro_expires_at = datetime.now(UTC) - timedelta(days=1)
    await db_session.commit()

    me = await client.get("/api/v1/auth/me")
    assert me.status_code == 200
    assert me.json()["is_pro"] is False
    assert me.json()["subscription_status"] == "manual_expired"
