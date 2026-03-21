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


# ============================================================
# API tests: Search endpoint
# ============================================================


@pytest.mark.asyncio
async def test_search_requires_query(client):
    """Missing or empty q returns 422."""
    await _ensure_user(client)
    resp = await client.get("/api/v1/search")
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_search_empty_results(client):
    """Searching with no data returns empty list."""
    await _ensure_user(client)
    resp = await client.get("/api/v1/search", params={"q": "nonexistent"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["results"] == []
    assert data["total"] == 0
    assert data["query"] == "nonexistent"


@pytest.mark.asyncio
async def test_search_finds_course_by_title(client):
    """Search matches course title."""
    await _ensure_user(client)
    course = await _create_course(client, title="React Fundamentals")
    await _create_course(client, title="Python Basics")

    resp = await client.get("/api/v1/search", params={"q": "React"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    titles = [r["title"] for r in data["results"]]
    assert "React Fundamentals" in titles
    assert "Python Basics" not in titles


@pytest.mark.asyncio
async def test_search_finds_course_by_description(client):
    """Search matches course description."""
    await _ensure_user(client)
    await _create_course(
        client,
        title="Course A",
        description="Learn about machine learning algorithms",
    )

    resp = await client.get("/api/v1/search", params={"q": "machine learning"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    assert data["results"][0]["type"] == "course"


@pytest.mark.asyncio
async def test_search_finds_lesson_by_title(client):
    """Search matches lesson title."""
    await _ensure_user(client)
    course = await _create_course(client, title="Course X")
    section = await _create_section(client, course["id"], title="Section 1")
    await _create_lesson(
        client, section["id"], title="Introduction to Hooks"
    )

    resp = await client.get("/api/v1/search", params={"q": "Hooks"})
    assert resp.status_code == 200
    data = resp.json()
    lesson_results = [r for r in data["results"] if r["type"] == "lesson"]
    assert len(lesson_results) >= 1
    assert "Hooks" in lesson_results[0]["title"]


@pytest.mark.asyncio
async def test_search_finds_lesson_by_notes(client):
    """Search matches lesson notes_markdown content."""
    await _ensure_user(client)
    course = await _create_course(client, title="MyC")
    section = await _create_section(client, course["id"], title="S1")
    lesson = await _create_lesson(client, section["id"], title="Lesson 1")

    # Update lesson with notes
    await client.put(
        f"/api/v1/sections/{section['id']}/lessons/{lesson['id']}",
        json={"notes_markdown": "The useState hook is a fundamental React concept"},
    )

    resp = await client.get("/api/v1/search", params={"q": "useState"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_search_finds_section_by_title(client):
    """Search matches section title."""
    await _ensure_user(client)
    course = await _create_course(client, title="C1")
    await _create_section(
        client, course["id"], title="Advanced Patterns"
    )

    resp = await client.get("/api/v1/search", params={"q": "Advanced Patterns"})
    assert resp.status_code == 200
    data = resp.json()
    section_results = [r for r in data["results"] if r["type"] == "section"]
    assert len(section_results) >= 1


@pytest.mark.asyncio
async def test_search_finds_study_notes(client):
    """Search matches study note content."""
    await _ensure_user(client)
    course = await _create_course(client, title="NC")
    section = await _create_section(client, course["id"])
    lesson = await _create_lesson(client, section["id"])

    # Create a study note
    await client.put(
        f"/api/v1/study/lessons/{lesson['id']}/notes",
        json={"content": "Remember to review dependency injection patterns"},
    )

    resp = await client.get(
        "/api/v1/search", params={"q": "dependency injection"}
    )
    assert resp.status_code == 200
    data = resp.json()
    note_results = [r for r in data["results"] if r["type"] == "note"]
    assert len(note_results) >= 1


@pytest.mark.asyncio
async def test_search_respects_limit(client):
    """Limit parameter restricts result count."""
    await _ensure_user(client)
    for i in range(5):
        await _create_course(client, title=f"Alpha Course {i}")

    resp = await client.get(
        "/api/v1/search", params={"q": "Alpha", "limit": 2}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] <= 2


@pytest.mark.asyncio
async def test_search_excludes_deleted_courses(client):
    """Deleted courses don't appear in results."""
    await _ensure_user(client)
    course = await _create_course(client, title="Deletable Course")
    # Soft delete
    await client.delete(f"/api/v1/courses/{course['id']}")

    resp = await client.get("/api/v1/search", params={"q": "Deletable"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 0


@pytest.mark.asyncio
async def test_search_result_has_breadcrumb(client):
    """Search results include breadcrumb navigation path."""
    await _ensure_user(client)
    course = await _create_course(client, title="Web Dev")
    section = await _create_section(
        client, course["id"], title="React Basics"
    )
    await _create_lesson(
        client, section["id"], title="JSX Syntax"
    )

    resp = await client.get("/api/v1/search", params={"q": "JSX"})
    assert resp.status_code == 200
    data = resp.json()
    lesson_results = [r for r in data["results"] if r["type"] == "lesson"]
    assert len(lesson_results) >= 1
    breadcrumb = lesson_results[0]["breadcrumb"]
    assert "Web Dev" in breadcrumb
    assert "JSX Syntax" in breadcrumb


@pytest.mark.asyncio
async def test_search_case_insensitive(client):
    """Search is case-insensitive."""
    await _ensure_user(client)
    await _create_course(client, title="TypeScript Master")

    resp = await client.get("/api/v1/search", params={"q": "typescript"})
    assert resp.status_code == 200
    assert resp.json()["total"] >= 1
