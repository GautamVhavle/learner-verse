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


# ============================================================
# Additional edge-case tests
# ============================================================


@pytest.mark.asyncio
async def test_update_me_bio(client):
    """PUT /auth/me should update the bio field."""
    await client.get("/api/v1/auth/me")

    response = await client.put(
        "/api/v1/auth/me",
        json={"bio": "I love learning!"},
    )
    assert response.status_code == 200
    assert response.json()["bio"] == "I love learning!"


@pytest.mark.asyncio
async def test_update_me_timezone(client):
    """PUT /auth/me should update timezone."""
    await client.get("/api/v1/auth/me")

    response = await client.put(
        "/api/v1/auth/me",
        json={"timezone": "America/New_York"},
    )
    assert response.status_code == 200
    assert response.json()["timezone"] == "America/New_York"


@pytest.mark.asyncio
async def test_update_me_onboarding_complete(client):
    """PUT /auth/me should mark onboarding as complete."""
    await client.get("/api/v1/auth/me")

    response = await client.put(
        "/api/v1/auth/me",
        json={"onboarding_complete": True},
    )
    assert response.status_code == 200
    assert response.json()["onboarding_complete"] is True


@pytest.mark.asyncio
async def test_update_me_auto_play_next(client):
    """PUT /auth/me should toggle auto_play_next."""
    await client.get("/api/v1/auth/me")

    response = await client.put(
        "/api/v1/auth/me",
        json={"auto_play_next": False},
    )
    assert response.status_code == 200
    assert response.json()["auto_play_next"] is False


@pytest.mark.asyncio
async def test_update_me_is_profile_public(client):
    """PUT /auth/me should toggle public profile visibility."""
    await client.get("/api/v1/auth/me")

    response = await client.put(
        "/api/v1/auth/me",
        json={"is_profile_public": True},
    )
    assert response.status_code == 200
    assert response.json()["is_profile_public"] is True


@pytest.mark.asyncio
async def test_update_me_social_links(client):
    """PUT /auth/me should update social links."""
    await client.get("/api/v1/auth/me")

    links = [{"platform": "github", "url": "https://github.com/testuser"}]
    response = await client.put(
        "/api/v1/auth/me",
        json={"social_links": links},
    )
    assert response.status_code == 200
    assert len(response.json()["social_links"]) == 1
    assert response.json()["social_links"][0]["platform"] == "github"


@pytest.mark.asyncio
async def test_update_me_profile_tags(client):
    """PUT /auth/me should update profile interest tags."""
    await client.get("/api/v1/auth/me")

    response = await client.put(
        "/api/v1/auth/me",
        json={"profile_tags": ["python", "machine-learning"]},
    )
    assert response.status_code == 200
    assert response.json()["profile_tags"] == ["python", "machine-learning"]


@pytest.mark.asyncio
async def test_update_me_empty_body(client):
    """PUT /auth/me with empty update should return user unchanged."""
    await client.get("/api/v1/auth/me")

    response = await client.put("/api/v1/auth/me", json={})
    assert response.status_code == 200
    assert response.json()["email"] == "local@learnerverse.dev"


@pytest.mark.asyncio
async def test_update_me_multiple_fields(client):
    """PUT /auth/me should update multiple fields atomically."""
    await client.get("/api/v1/auth/me")

    response = await client.put(
        "/api/v1/auth/me",
        json={
            "display_name": "Multi Update",
            "bio": "Testing multi-field update",
            "playback_speed": 1.5,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["display_name"] == "Multi Update"
    assert data["bio"] == "Testing multi-field update"
    assert data["playback_speed"] == 1.5


@pytest.mark.asyncio
async def test_get_me_idempotent(client):
    """GET /auth/me called twice returns same user (no duplicates)."""
    resp1 = await client.get("/api/v1/auth/me")
    resp2 = await client.get("/api/v1/auth/me")
    assert resp1.json()["id"] == resp2.json()["id"]
    assert resp1.json()["email"] == resp2.json()["email"]


@pytest.mark.asyncio
async def test_update_me_playback_speed_boundary_low(client):
    """PUT /auth/me should accept minimum playback speed (0.25)."""
    await client.get("/api/v1/auth/me")

    response = await client.put(
        "/api/v1/auth/me",
        json={"playback_speed": 0.25},
    )
    assert response.status_code == 200
    assert response.json()["playback_speed"] == 0.25


@pytest.mark.asyncio
async def test_update_me_playback_speed_below_minimum(client):
    """PUT /auth/me should reject playback_speed below minimum."""
    await client.get("/api/v1/auth/me")

    response = await client.put(
        "/api/v1/auth/me",
        json={"playback_speed": 0.1},
    )
    assert response.status_code == 422
