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
# Toggle Progress Tests
# ============================================================


@pytest.mark.asyncio
async def test_toggle_lesson_complete(client):
    """Can mark a lesson as complete."""
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    lesson = await _create_lesson(client, section["id"])

    resp = await client.put(
        f"/api/v1/progress/lessons/{lesson['id']}",
        json={"completed": True},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["lesson_id"] == lesson["id"]
    assert data["completed"] is True
    assert data["completed_at"] is not None


@pytest.mark.asyncio
async def test_toggle_lesson_incomplete(client):
    """Can unmark a lesson (toggle off)."""
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    lesson = await _create_lesson(client, section["id"])

    await client.put(
        f"/api/v1/progress/lessons/{lesson['id']}",
        json={"completed": True},
    )
    resp = await client.put(
        f"/api/v1/progress/lessons/{lesson['id']}",
        json={"completed": False},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["completed"] is False
    assert data["completed_at"] is None


@pytest.mark.asyncio
async def test_toggle_idempotent(client):
    """Toggling same state twice doesn't create duplicates."""
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    lesson = await _create_lesson(client, section["id"])

    await client.put(
        f"/api/v1/progress/lessons/{lesson['id']}",
        json={"completed": True},
    )
    resp = await client.put(
        f"/api/v1/progress/lessons/{lesson['id']}",
        json={"completed": True},
    )
    assert resp.status_code == 200
    assert resp.json()["completed"] is True


# ============================================================
# Course Progress Tests
# ============================================================


@pytest.mark.asyncio
async def test_course_progress_empty(client):
    """Course with no progress returns 0%."""
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    await _create_lesson(client, section["id"], title="L1")
    await _create_lesson(client, section["id"], title="L2")

    resp = await client.get(f"/api/v1/progress/courses/{course['id']}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["course_id"] == course["id"]
    assert data["total_lessons"] == 2
    assert data["completed_lessons"] == 0
    assert data["percentage"] == 0
    assert len(data["sections"]) == 1
    assert data["sections"][0]["total_lessons"] == 2
    assert data["sections"][0]["completed_lessons"] == 0


@pytest.mark.asyncio
async def test_course_progress_partial(client):
    """Completing some lessons shows correct percentage."""
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    l1 = await _create_lesson(client, section["id"], title="L1")
    l2 = await _create_lesson(client, section["id"], title="L2")
    l3 = await _create_lesson(client, section["id"], title="L3")

    # Complete 1 of 3
    await client.put(
        f"/api/v1/progress/lessons/{l1['id']}",
        json={"completed": True},
    )

    resp = await client.get(f"/api/v1/progress/courses/{course['id']}")
    data = resp.json()
    assert data["completed_lessons"] == 1
    assert data["total_lessons"] == 3
    assert data["percentage"] == pytest.approx(33.3, abs=0.1)


@pytest.mark.asyncio
async def test_course_progress_full(client):
    """Completing all lessons shows 100%."""
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    l1 = await _create_lesson(client, section["id"], title="L1")
    l2 = await _create_lesson(client, section["id"], title="L2")

    await client.put(
        f"/api/v1/progress/lessons/{l1['id']}",
        json={"completed": True},
    )
    await client.put(
        f"/api/v1/progress/lessons/{l2['id']}",
        json={"completed": True},
    )

    resp = await client.get(f"/api/v1/progress/courses/{course['id']}")
    data = resp.json()
    assert data["completed_lessons"] == 2
    assert data["percentage"] == 100.0


@pytest.mark.asyncio
async def test_course_progress_multi_section(client):
    """Progress works across multiple sections."""
    await _ensure_user(client)
    course = await _create_course(client)
    s1 = await _create_section(client, course["id"], title="Section 1")
    s2 = await _create_section(client, course["id"], title="Section 2")
    l1 = await _create_lesson(client, s1["id"], title="S1 L1")
    l2 = await _create_lesson(client, s1["id"], title="S1 L2")
    l3 = await _create_lesson(client, s2["id"], title="S2 L1")

    await client.put(
        f"/api/v1/progress/lessons/{l1['id']}",
        json={"completed": True},
    )

    resp = await client.get(f"/api/v1/progress/courses/{course['id']}")
    data = resp.json()
    assert data["total_lessons"] == 3
    assert data["completed_lessons"] == 1

    sections = data["sections"]
    assert len(sections) == 2
    # s1 has 1/2 complete
    assert sections[0]["completed_lessons"] == 1
    assert sections[0]["total_lessons"] == 2
    # s2 has 0/1 complete
    assert sections[1]["completed_lessons"] == 0
    assert sections[1]["total_lessons"] == 1


@pytest.mark.asyncio
async def test_course_progress_lesson_map(client):
    """lesson_progress dict maps lesson IDs to boolean."""
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    l1 = await _create_lesson(client, section["id"], title="L1")
    l2 = await _create_lesson(client, section["id"], title="L2")

    await client.put(
        f"/api/v1/progress/lessons/{l1['id']}",
        json={"completed": True},
    )

    resp = await client.get(f"/api/v1/progress/courses/{course['id']}")
    data = resp.json()

    assert data["lesson_progress"][l1["id"]] is True
    assert data["lesson_progress"][l2["id"]] is False


@pytest.mark.asyncio
async def test_course_progress_no_lessons(client):
    """Course with no lessons returns 0%."""
    await _ensure_user(client)
    course = await _create_course(client)

    resp = await client.get(f"/api/v1/progress/courses/{course['id']}")
    data = resp.json()
    assert data["total_lessons"] == 0
    assert data["percentage"] == 0
    assert data["sections"] == []
