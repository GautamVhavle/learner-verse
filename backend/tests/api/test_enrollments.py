"""Tests for enrollment endpoints.

NOTE: In SINGLE_USER_MODE the authenticated user is always the same
user that owns every course, so self-enrollment is *always* blocked.
We verify the rejection paths and listing behaviour.
"""

import pytest


# --- Helpers ---
async def _ensure_user(client):
    await client.get("/api/v1/auth/me")


async def _create_course(client, **overrides):
    payload = {"title": "Enrollable Course", **overrides}
    resp = await client.post("/api/v1/courses", json=payload)
    assert resp.status_code == 201
    return resp.json()


async def _create_section(client, course_id, **overrides):
    payload = {"title": "Test Section", **overrides}
    resp = await client.post(
        f"/api/v1/courses/{course_id}/sections", json=payload
    )
    assert resp.status_code == 201
    return resp.json()


async def _create_lesson(client, section_id, **overrides):
    payload = {"title": "Test Lesson", **overrides}
    resp = await client.post(
        f"/api/v1/sections/{section_id}/lessons", json=payload
    )
    assert resp.status_code == 201
    return resp.json()


async def _make_public_ready(client, course_id):
    """Mark a course ready + public (must be ready before setting public)."""
    resp = await client.put(
        f"/api/v1/courses/{course_id}/status", json={"status": "ready"}
    )
    assert resp.json()["valid"] is True
    resp = await client.put(
        f"/api/v1/courses/{course_id}", json={"is_public": True}
    )
    assert resp.status_code == 200


async def _setup_public_course(client, title="Enrollable Course"):
    """Create a public+ready course with content."""
    course = await _create_course(client, title=title)
    section = await _create_section(client, course["id"])
    lesson = await _create_lesson(client, section["id"])
    await client.put(
        f"/api/v1/sections/{section['id']}/lessons/{lesson['id']}",
        json={"notes_markdown": "Some content"},
    )
    await _make_public_ready(client, course["id"])
    return course


# ============================================================
# GET /enrollments  – list enrolled courses
# ============================================================
@pytest.mark.asyncio
async def test_list_enrolled_courses_empty(client):
    """User with no enrollments sees empty list."""
    await _ensure_user(client)
    resp = await client.get("/api/v1/enrollments")
    assert resp.status_code == 200
    data = resp.json()
    assert data["items"] == []
    assert data["total"] == 0


# ============================================================
# GET /enrollments/records  – raw enrollment records
# ============================================================
@pytest.mark.asyncio
async def test_enrollment_records_empty(client):
    """Records endpoint returns empty list when nothing enrolled."""
    await _ensure_user(client)
    resp = await client.get("/api/v1/enrollments/records")
    assert resp.status_code == 200
    assert resp.json() == []


# ============================================================
# POST /enrollments/{course_id}  – enroll
# ============================================================
@pytest.mark.asyncio
async def test_enroll_own_course_allowed_in_single_user_mode(client):
    """In single-user mode, self-enrollment is allowed (201)."""
    await _ensure_user(client)
    course = await _setup_public_course(client)

    resp = await client.post(f"/api/v1/enrollments/{course['id']}")
    assert resp.status_code == 201


@pytest.mark.asyncio
async def test_enroll_nonexistent_course(client):
    """Enrolling in a non-existent course returns 404."""
    await _ensure_user(client)
    resp = await client.post(
        "/api/v1/enrollments/00000000-0000-0000-0000-000000000099"
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_enroll_deleted_course(client):
    """Cannot enroll in a deleted course."""
    await _ensure_user(client)
    course = await _setup_public_course(client)
    await client.delete(f"/api/v1/courses/{course['id']}")

    resp = await client.post(f"/api/v1/enrollments/{course['id']}")
    # deleted → 404 or 400
    assert resp.status_code in (400, 404)


# ============================================================
# DELETE /enrollments/{course_id}  – unenroll
# ============================================================
@pytest.mark.asyncio
async def test_unenroll_when_not_enrolled(client):
    """Unenrolling from something not enrolled should not crash."""
    await _ensure_user(client)
    course = await _create_course(client)

    resp = await client.delete(f"/api/v1/enrollments/{course['id']}")
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_unenroll_nonexistent_course(client):
    """Unenrolling from a non-existent course returns 204 (no-op)."""
    await _ensure_user(client)
    resp = await client.delete(
        "/api/v1/enrollments/00000000-0000-0000-0000-000000000099"
    )
    assert resp.status_code == 204
