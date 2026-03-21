import uuid

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


# ============================================================
# Study State Tests
# ============================================================


@pytest.mark.asyncio
async def test_get_study_state_empty(client):
    """When no state exists, returns null."""
    await _ensure_user(client)
    course = await _create_course(client)
    resp = await client.get(f"/api/v1/study/courses/{course['id']}/state")
    assert resp.status_code == 200
    assert resp.json() is None


@pytest.mark.asyncio
async def test_update_and_get_study_state(client):
    """Can save and retrieve last lesson position."""
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    lesson = await _create_lesson(client, section["id"])

    # Update state
    resp = await client.put(
        f"/api/v1/study/courses/{course['id']}/state",
        json={"last_lesson_id": lesson["id"]},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["course_id"] == course["id"]
    assert data["last_lesson_id"] == lesson["id"]
    assert "last_accessed_at" in data

    # Get state
    resp = await client.get(f"/api/v1/study/courses/{course['id']}/state")
    assert resp.status_code == 200
    assert resp.json()["last_lesson_id"] == lesson["id"]


@pytest.mark.asyncio
async def test_study_state_upsert(client):
    """Updating state again overwrites the previous value."""
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    lesson1 = await _create_lesson(client, section["id"], title="Lesson 1")
    lesson2 = await _create_lesson(client, section["id"], title="Lesson 2")

    await client.put(
        f"/api/v1/study/courses/{course['id']}/state",
        json={"last_lesson_id": lesson1["id"]},
    )
    resp = await client.put(
        f"/api/v1/study/courses/{course['id']}/state",
        json={"last_lesson_id": lesson2["id"]},
    )
    assert resp.status_code == 200
    assert resp.json()["last_lesson_id"] == lesson2["id"]


# ============================================================
# Study Notes Tests
# ============================================================


@pytest.mark.asyncio
async def test_get_study_note_empty(client):
    """When no note exists, returns null content."""
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    lesson = await _create_lesson(client, section["id"])

    resp = await client.get(f"/api/v1/study/lessons/{lesson['id']}/notes")
    assert resp.status_code == 200
    data = resp.json()
    assert data["content"] is None
    assert data["updated_at"] is None


@pytest.mark.asyncio
async def test_update_and_get_study_note(client):
    """Can save and retrieve study notes."""
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    lesson = await _create_lesson(client, section["id"])

    # Create note
    resp = await client.put(
        f"/api/v1/study/lessons/{lesson['id']}/notes",
        json={"content": "# My Notes\n\nSome study notes here."},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["content"] == "# My Notes\n\nSome study notes here."
    assert data["updated_at"] is not None

    # Get note
    resp = await client.get(f"/api/v1/study/lessons/{lesson['id']}/notes")
    assert resp.status_code == 200
    assert resp.json()["content"] == "# My Notes\n\nSome study notes here."


@pytest.mark.asyncio
async def test_study_note_upsert(client):
    """Updating note again overwrites rather than creating duplicate."""
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    lesson = await _create_lesson(client, section["id"])

    await client.put(
        f"/api/v1/study/lessons/{lesson['id']}/notes",
        json={"content": "First version"},
    )
    resp = await client.put(
        f"/api/v1/study/lessons/{lesson['id']}/notes",
        json={"content": "Updated version"},
    )
    assert resp.status_code == 200
    assert resp.json()["content"] == "Updated version"


@pytest.mark.asyncio
async def test_study_note_clear(client):
    """Can set note to null to clear it."""
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    lesson = await _create_lesson(client, section["id"])

    await client.put(
        f"/api/v1/study/lessons/{lesson['id']}/notes",
        json={"content": "Some notes"},
    )
    resp = await client.put(
        f"/api/v1/study/lessons/{lesson['id']}/notes",
        json={"content": None},
    )
    assert resp.status_code == 200
    assert resp.json()["content"] is None


@pytest.mark.asyncio
async def test_study_notes_per_lesson_isolation(client):
    """Notes for different lessons are independent."""
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    lesson1 = await _create_lesson(client, section["id"], title="Lesson 1")
    lesson2 = await _create_lesson(client, section["id"], title="Lesson 2")

    await client.put(
        f"/api/v1/study/lessons/{lesson1['id']}/notes",
        json={"content": "Notes for lesson 1"},
    )
    await client.put(
        f"/api/v1/study/lessons/{lesson2['id']}/notes",
        json={"content": "Notes for lesson 2"},
    )

    resp1 = await client.get(f"/api/v1/study/lessons/{lesson1['id']}/notes")
    resp2 = await client.get(f"/api/v1/study/lessons/{lesson2['id']}/notes")

    assert resp1.json()["content"] == "Notes for lesson 1"
    assert resp2.json()["content"] == "Notes for lesson 2"
