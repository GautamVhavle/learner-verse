"""Tests for public profile endpoint."""

import pytest

USER_ID = "00000000-0000-0000-0000-000000000001"


# --- Helpers ---
async def _ensure_user(client):
    await client.get("/api/v1/auth/me")


async def _set_profile_public(client, public: bool = True):
    resp = await client.put("/api/v1/auth/me", json={"is_profile_public": public})
    assert resp.status_code == 200


# ============================================================
# GET /profile/{user_id}
# ============================================================
@pytest.mark.asyncio
async def test_public_profile_when_public(client):
    """Public profile is accessible when is_profile_public=True."""
    await _ensure_user(client)
    await _set_profile_public(client, True)

    resp = await client.get(f"/api/v1/profile/{USER_ID}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == USER_ID


@pytest.mark.asyncio
async def test_public_profile_when_private(client):
    """Profile returns 404 when is_profile_public=False."""
    await _ensure_user(client)
    await _set_profile_public(client, False)

    resp = await client.get(f"/api/v1/profile/{USER_ID}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_public_profile_nonexistent_user(client):
    """Profile for non-existent user returns 404."""
    await _ensure_user(client)
    resp = await client.get("/api/v1/profile/00000000-0000-0000-0000-000000000099")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_public_profile_includes_stats(client):
    """Public profile response includes stats fields."""
    await _ensure_user(client)
    await _set_profile_public(client, True)

    resp = await client.get(f"/api/v1/profile/{USER_ID}")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_courses_completed" in data
    assert "total_lessons_completed" in data
    assert "certificates" in data
    assert "activity_heatmap" in data


@pytest.mark.asyncio
async def test_public_profile_includes_display_name(client):
    """Profile shows the user's display_name."""
    await _ensure_user(client)
    await client.put(
        "/api/v1/auth/me",
        json={"display_name": "Test User", "is_profile_public": True},
    )

    resp = await client.get(f"/api/v1/profile/{USER_ID}")
    assert resp.status_code == 200
    assert resp.json()["display_name"] == "Test User"
