import pytest


@pytest.mark.asyncio
async def test_get_me_single_user_mode(client):
    """In single-user mode, GET /auth/me should return the default user."""
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 200

    data = response.json()
    assert data["email"] == "local@learnerverse.dev"
    assert data["display_name"] == "Local User"
    assert data["id"] == "00000000-0000-0000-0000-000000000001"
    assert data["timezone"] == "UTC"
    assert data["playback_speed"] == 1.0
    assert data["font_size"] == "normal"


@pytest.mark.asyncio
async def test_update_me_display_name(client):
    """PUT /auth/me should update user fields."""
    # First ensure user exists
    await client.get("/api/v1/auth/me")

    response = await client.put(
        "/api/v1/auth/me",
        json={"display_name": "Updated Name"},
    )
    assert response.status_code == 200

    data = response.json()
    assert data["display_name"] == "Updated Name"
    assert data["email"] == "local@learnerverse.dev"


@pytest.mark.asyncio
async def test_update_me_playback_speed(client):
    """PUT /auth/me should update playback_speed within valid range."""
    await client.get("/api/v1/auth/me")

    response = await client.put(
        "/api/v1/auth/me",
        json={"playback_speed": 2.0},
    )
    assert response.status_code == 200
    assert response.json()["playback_speed"] == 2.0


@pytest.mark.asyncio
async def test_update_me_invalid_playback_speed(client):
    """PUT /auth/me should reject invalid playback_speed."""
    await client.get("/api/v1/auth/me")

    response = await client.put(
        "/api/v1/auth/me",
        json={"playback_speed": 10.0},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_update_me_font_size(client):
    """PUT /auth/me should update font_size with valid values."""
    await client.get("/api/v1/auth/me")

    for size in ["normal", "large", "xl"]:
        response = await client.put(
            "/api/v1/auth/me",
            json={"font_size": size},
        )
        assert response.status_code == 200
        assert response.json()["font_size"] == size


@pytest.mark.asyncio
async def test_update_me_invalid_font_size(client):
    """PUT /auth/me should reject invalid font_size."""
    await client.get("/api/v1/auth/me")

    response = await client.put(
        "/api/v1/auth/me",
        json={"font_size": "huge"},
    )
    assert response.status_code == 422
