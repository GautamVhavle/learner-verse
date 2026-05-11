import pytest


# --- Helpers ---
async def _ensure_user(client):
    await client.get("/api/v1/auth/me")


async def _create_course(client, **overrides):
    payload = {"title": "Test Course", **overrides}
    resp = await client.post("/api/v1/courses", json=payload)
    assert resp.status_code == 201
    return resp.json()


async def _create_section(client, course_id, **overrides):
    payload = {"title": "Test Section", **overrides}
    resp = await client.post(f"/api/v1/courses/{course_id}/sections", json=payload)
    assert resp.status_code == 201
    return resp.json()


async def _create_lesson(client, section_id, **overrides):
    payload = {"title": "Test Lesson", **overrides}
    resp = await client.post(f"/api/v1/sections/{section_id}/lessons", json=payload)
    assert resp.status_code == 201
    return resp.json()


async def _add_content_to_lesson(client, section_id, lesson_id):
    """Give a lesson some markdown content so it passes validation."""
    resp = await client.put(
        f"/api/v1/sections/{section_id}/lessons/{lesson_id}",
        json={"notes_markdown": "# Study notes"},
    )
    assert resp.status_code == 200
    return resp.json()


# ============================================================
# COURSE STATS
# ============================================================
@pytest.mark.asyncio
async def test_course_response_includes_stats(client):
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    lesson = await _create_lesson(client, section["id"])
    await _add_content_to_lesson(client, section["id"], lesson["id"])

    resp = await client.get(f"/api/v1/courses/{course['id']}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["section_count"] == 1
    assert data["lesson_count"] == 1
    assert data["has_issues"] is False


@pytest.mark.asyncio
async def test_course_stats_shows_issues_for_empty_lesson(client):
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    await _create_lesson(client, section["id"])  # no content

    resp = await client.get(f"/api/v1/courses/{course['id']}")
    data = resp.json()
    assert data["has_issues"] is True


@pytest.mark.asyncio
async def test_course_list_includes_stats(client):
    await _ensure_user(client)
    course = await _create_course(client)
    await _create_section(client, course["id"])

    resp = await client.get("/api/v1/courses")
    data = resp.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["section_count"] == 1
    assert data["items"][0]["lesson_count"] == 0


# ============================================================
# STATUS UPDATE - MARK READY (with validation)
# ============================================================
@pytest.mark.asyncio
async def test_mark_ready_valid_course(client):
    """A course with sections + lessons that have content can go Ready."""
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    lesson = await _create_lesson(client, section["id"])
    await _add_content_to_lesson(client, section["id"], lesson["id"])

    resp = await client.put(
        f"/api/v1/courses/{course['id']}/status",
        json={"status": "ready"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ready"
    assert data["valid"] is True
    assert data["errors"] == []


@pytest.mark.asyncio
async def test_mark_ready_empty_course_fails(client):
    """A course with no sections fails validation."""
    await _ensure_user(client)
    course = await _create_course(client)

    resp = await client.put(
        f"/api/v1/courses/{course['id']}/status",
        json={"status": "ready"},
    )
    data = resp.json()
    assert data["valid"] is False
    assert len(data["errors"]) > 0
    assert data["status"] == "draft"  # stays draft


@pytest.mark.asyncio
async def test_mark_ready_section_with_no_lessons_fails(client):
    """A section with no lessons blocks going Ready."""
    await _ensure_user(client)
    course = await _create_course(client)
    await _create_section(client, course["id"])  # empty section

    resp = await client.put(
        f"/api/v1/courses/{course['id']}/status",
        json={"status": "ready"},
    )
    data = resp.json()
    assert data["valid"] is False
    assert any("no lessons" in e["message"] for e in data["errors"])


@pytest.mark.asyncio
async def test_mark_ready_lesson_with_no_content_fails(client):
    """A lesson with no video/notes/links blocks going Ready."""
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    await _create_lesson(client, section["id"])  # no content

    resp = await client.put(
        f"/api/v1/courses/{course['id']}/status",
        json={"status": "ready"},
    )
    data = resp.json()
    assert data["valid"] is False
    assert any("no content" in e["message"] for e in data["errors"])


@pytest.mark.asyncio
async def test_back_to_draft_no_validation(client):
    """Going back to Draft requires no validation."""
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    lesson = await _create_lesson(client, section["id"])
    await _add_content_to_lesson(client, section["id"], lesson["id"])

    # First go ready
    await client.put(
        f"/api/v1/courses/{course['id']}/status",
        json={"status": "ready"},
    )

    # Then back to draft - always succeeds
    resp = await client.put(
        f"/api/v1/courses/{course['id']}/status",
        json={"status": "draft"},
    )
    data = resp.json()
    assert data["status"] == "draft"
    assert data["valid"] is True


@pytest.mark.asyncio
async def test_status_update_not_found(client):
    await _ensure_user(client)
    resp = await client.put(
        "/api/v1/courses/00000000-0000-0000-0000-000000000099/status",
        json={"status": "ready"},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_status_update_invalid_value(client):
    await _ensure_user(client)
    course = await _create_course(client)
    resp = await client.put(
        f"/api/v1/courses/{course['id']}/status",
        json={"status": "published"},
    )
    assert resp.status_code == 422
