"""Validation and lifecycle tests for MCP settings endpoints."""

from datetime import UTC, datetime, timedelta

import pytest


async def _ensure_user(client):
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_token_creation_rejects_unknown_scope(client):
    await _ensure_user(client)
    response = await client.post(
        "/api/v1/mcp-settings/tokens",
        json={"name": "IDE", "scopes": ["mcp:read", "admin:everything"]},
    )
    assert response.status_code == 422
    assert "unsupported MCP scopes" in response.text


@pytest.mark.asyncio
async def test_token_creation_rejects_past_expiration(client):
    await _ensure_user(client)
    response = await client.post(
        "/api/v1/mcp-settings/tokens",
        json={
            "name": "Expired IDE key",
            "scopes": ["mcp:read"],
            "expires_at": (datetime.now(UTC) - timedelta(minutes=1)).isoformat(),
        },
    )
    assert response.status_code == 422
    assert "expiration must be in the future" in response.text


@pytest.mark.asyncio
async def test_token_creation_enforces_configured_active_limit(client, monkeypatch):
    from app.core.config import settings

    await _ensure_user(client)
    monkeypatch.setattr(settings, "PRODUCTION_MAX_TOKENS_PER_USER", 1)
    payload = {"name": "IDE", "scopes": ["mcp:read"]}

    first = await client.post("/api/v1/mcp-settings/tokens", json=payload)
    second = await client.post("/api/v1/mcp-settings/tokens", json=payload)

    assert first.status_code == 200
    assert second.status_code == 409
    assert "Revoke an old key first" in second.json()["detail"]


@pytest.mark.asyncio
async def test_credential_fields_are_bounded_before_database_write(client):
    await _ensure_user(client)
    response = await client.put(
        "/api/v1/mcp-settings/credentials",
        json={
            "provider": "p" * 81,
            "credential_kind": "api_key",
            "label": "default",
            "secret": "secret",
        },
    )
    assert response.status_code == 422
