"""Tests for hub (course discovery) and ratings endpoints."""

import pytest


# --- Helpers ---
async def _ensure_user(client):
    await client.get("/api/v1/auth/me")


async def _create_course(client, **overrides):
    payload = {"title": "Hub Course", **overrides}
    resp = await client.post("/api/v1/courses", json=payload)
    assert resp.status_code == 201
    return resp.json()


async def _create_section(client, course_id, **overrides):
    payload = {"title": "Hub Section", **overrides}
    resp = await client.post(f"/api/v1/courses/{course_id}/sections", json=payload)
    assert resp.status_code == 201
    return resp.json()


async def _create_lesson(client, section_id, **overrides):
    payload = {"title": "Hub Lesson", **overrides}
    resp = await client.post(f"/api/v1/sections/{section_id}/lessons", json=payload)
    assert resp.status_code == 201
    return resp.json()


async def _make_public_ready(client, course_id):
    """Set course to ready + public (must be ready before setting public)."""
    resp = await client.put(f"/api/v1/courses/{course_id}/status", json={"status": "ready"})
    assert resp.json()["valid"] is True, f"Course not valid for ready: {resp.json()}"
    resp = await client.put(f"/api/v1/courses/{course_id}", json={"is_public": True})
    assert resp.status_code == 200


async def _setup_public_course(client, title="Hub Course"):
    """Create a public+ready course with a section, lesson, and content."""
    course = await _create_course(client, title=title)
    section = await _create_section(client, course["id"])
    lesson = await _create_lesson(client, section["id"])
    # Lesson needs content to pass validation
    await client.put(
        f"/api/v1/sections/{section['id']}/lessons/{lesson['id']}",
        json={"notes_markdown": "Some content"},
    )
    await _make_public_ready(client, course["id"])
    return course


# ============================================================
# GET /hub/categories
# ============================================================
@pytest.mark.asyncio
async def test_hub_categories(client):
    """Categories endpoint returns a list."""
    await _ensure_user(client)
    resp = await client.get("/api/v1/hub/categories")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


# ============================================================
# GET /hub/courses  – public course listing
# ============================================================
@pytest.mark.asyncio
async def test_hub_courses_empty(client):
    """No public courses → empty list."""
    await _ensure_user(client)
    resp = await client.get("/api/v1/hub/courses")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 0


@pytest.mark.asyncio
async def test_hub_courses_shows_public_ready(client):
    """Public + ready course appears in hub listing."""
    await _ensure_user(client)
    course = await _setup_public_course(client, title="Visible Course")

    resp = await client.get("/api/v1/hub/courses")
    assert resp.status_code == 200
    titles = [c["title"] for c in resp.json()["items"]]
    assert "Visible Course" in titles


@pytest.mark.asyncio
async def test_hub_courses_hides_draft(client):
    """Draft (non-ready) course does not appear in hub."""
    await _ensure_user(client)
    course = await _create_course(client, title="Draft Course")
    await client.put(f"/api/v1/courses/{course['id']}", json={"is_public": True})
    # Do NOT set status=ready

    resp = await client.get("/api/v1/hub/courses")
    assert resp.status_code == 200
    titles = [c["title"] for c in resp.json()["items"]]
    assert "Draft Course" not in titles


@pytest.mark.asyncio
async def test_hub_courses_search(client):
    """Search filter works on hub courses."""
    await _ensure_user(client)
    await _setup_public_course(client, title="UniqueSearchable")

    resp = await client.get("/api/v1/hub/courses", params={"search": "UniqueSearchable"})
    assert resp.status_code == 200
    assert resp.json()["total"] >= 1


# ============================================================
# GET /hub/my-courses
# ============================================================
@pytest.mark.asyncio
async def test_hub_my_courses(client):
    """My-courses lists the user's own courses."""
    await _ensure_user(client)
    await _create_course(client, title="My Own Course")

    resp = await client.get("/api/v1/hub/my-courses")
    assert resp.status_code == 200
    titles = [c["title"] for c in resp.json()["items"]]
    assert "My Own Course" in titles


# ============================================================
# GET /hub/courses/{course_id}  – single course detail
# ============================================================
@pytest.mark.asyncio
async def test_hub_course_detail_as_owner(client):
    """Owner can view their own course via hub detail endpoint."""
    await _ensure_user(client)
    course = await _setup_public_course(client)

    resp = await client.get(f"/api/v1/hub/courses/{course['id']}")
    assert resp.status_code == 200
    assert resp.json()["id"] == course["id"]


@pytest.mark.asyncio
async def test_hub_course_detail_nonexistent(client):
    """Non-existent course returns 404."""
    await _ensure_user(client)
    resp = await client.get("/api/v1/hub/courses/00000000-0000-0000-0000-000000000099")
    assert resp.status_code == 404


# ============================================================
# GET /hub/public/courses/{course_id}  – public endpoint
# ============================================================
@pytest.mark.asyncio
async def test_hub_public_course_when_ready(client):
    """Public endpoint returns course when public + ready."""
    await _ensure_user(client)
    course = await _setup_public_course(client)

    resp = await client.get(f"/api/v1/hub/public/courses/{course['id']}")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_hub_public_course_when_draft(client):
    """Public endpoint returns 404 for draft course."""
    await _ensure_user(client)
    course = await _create_course(client)

    resp = await client.get(f"/api/v1/hub/public/courses/{course['id']}")
    assert resp.status_code == 404


# ============================================================
# Ratings
# ============================================================
@pytest.mark.asyncio
async def test_ratings_list_empty(client):
    """No ratings returns empty list with average 0."""
    await _ensure_user(client)
    course = await _setup_public_course(client)

    resp = await client.get(f"/api/v1/hub/courses/{course['id']}/ratings")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 0


@pytest.mark.asyncio
async def test_rating_on_private_course_blocked(client):
    """Cannot rate a non-public course."""
    await _ensure_user(client)
    course = await _create_course(client)

    resp = await client.post(
        f"/api/v1/hub/courses/{course['id']}/ratings",
        json={"rating": 5, "review": "Great!"},
    )
    # Should fail – course not public
    assert resp.status_code in (400, 403, 404)


@pytest.mark.asyncio
async def test_rating_invalid_score(client):
    """Rating outside 1-5 should be rejected."""
    await _ensure_user(client)
    course = await _setup_public_course(client)

    resp = await client.post(
        f"/api/v1/hub/courses/{course['id']}/ratings",
        json={"rating": 0},
    )
    assert resp.status_code == 422

    resp = await client.post(
        f"/api/v1/hub/courses/{course['id']}/ratings",
        json={"rating": 6},
    )
    assert resp.status_code == 422
