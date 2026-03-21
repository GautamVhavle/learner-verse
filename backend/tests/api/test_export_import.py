import io
import json

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


async def _add_reference_link(client, section_id, lesson_id, **overrides):
    payload = {"url": "https://example.com", **overrides}
    resp = await client.post(
        f"/api/v1/sections/{section_id}/lessons/{lesson_id}/references",
        json=payload,
    )
    assert resp.status_code == 201
    return resp.json()


async def _build_full_course(client):
    """Build a course with sections, lessons, links, and tags for export testing."""
    course = await _create_course(
        client,
        title="React Masterclass",
        description="A comprehensive React course",
        tags=["react", "frontend"],
    )
    s1 = await _create_section(client, course["id"], title="Getting Started")
    l1 = await _create_lesson(
        client,
        s1["id"],
        title="Introduction",
    )
    # Update lesson with content
    await client.put(
        f"/api/v1/sections/{s1['id']}/lessons/{l1['id']}",
        json={
            "youtube_url": "https://youtube.com/watch?v=abc",
            "notes_markdown": "# Welcome\nThis is the intro.",
        },
    )
    await _add_reference_link(
        client,
        s1["id"],
        l1["id"],
        url="https://react.dev",
        title="React Docs",
    )

    s2 = await _create_section(client, course["id"], title="Hooks")
    await _create_lesson(client, s2["id"], title="useState")
    await _create_lesson(client, s2["id"], title="useEffect")

    return course


# ============================================================
# Export tests
# ============================================================


@pytest.mark.asyncio
async def test_export_course_structure(client):
    """Export returns correct JSON structure with all nested data."""
    await _ensure_user(client)
    course = await _build_full_course(client)

    resp = await client.get(f"/api/v1/courses/{course['id']}/export")
    assert resp.status_code == 200

    data = resp.json()
    assert data["export_version"] == 1
    assert data["title"] == "React Masterclass"
    assert data["description"] == "A comprehensive React course"
    assert set(data["tags"]) == {"react", "frontend"}
    assert len(data["sections"]) == 2

    # First section
    s1 = data["sections"][0]
    assert s1["title"] == "Getting Started"
    assert len(s1["lessons"]) == 1

    l1 = s1["lessons"][0]
    assert l1["title"] == "Introduction"
    assert l1["youtube_url"] == "https://youtube.com/watch?v=abc"
    assert "# Welcome" in l1["notes_markdown"]
    assert len(l1["reference_links"]) == 1
    assert l1["reference_links"][0]["url"] == "https://react.dev"

    # Second section
    s2 = data["sections"][1]
    assert s2["title"] == "Hooks"
    assert len(s2["lessons"]) == 2


@pytest.mark.asyncio
async def test_export_not_found(client):
    """Export of non-existent course returns 404."""
    await _ensure_user(client)
    resp = await client.get(
        "/api/v1/courses/00000000-0000-0000-0000-000000000099/export"
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_export_has_content_disposition(client):
    """Export response has a Content-Disposition header for download."""
    await _ensure_user(client)
    course = await _create_course(client, title="My Course")
    resp = await client.get(f"/api/v1/courses/{course['id']}/export")
    assert resp.status_code == 200
    assert "content-disposition" in resp.headers
    assert ".json" in resp.headers["content-disposition"]


# ============================================================
# Import tests
# ============================================================


@pytest.mark.asyncio
async def test_import_from_export(client):
    """Export a course, import it, and verify the copy matches."""
    await _ensure_user(client)
    course = await _build_full_course(client)

    # Export
    export_resp = await client.get(f"/api/v1/courses/{course['id']}/export")
    assert export_resp.status_code == 200
    export_data = export_resp.json()

    # Import
    file_bytes = json.dumps(export_data).encode()
    import_resp = await client.post(
        "/api/v1/courses/import",
        files={"file": ("course.json", io.BytesIO(file_bytes), "application/json")},
    )
    assert import_resp.status_code == 201

    imported = import_resp.json()
    assert imported["title"] == "React Masterclass"
    assert imported["id"] != course["id"]  # New UUID
    assert imported["status"] == "draft"
    assert imported["section_count"] == 2
    assert imported["lesson_count"] == 3


@pytest.mark.asyncio
async def test_import_preserves_tags(client):
    """Imported course has the same tags."""
    await _ensure_user(client)
    course = await _create_course(client, title="Tagged", tags=["python", "ml"])
    export_resp = await client.get(f"/api/v1/courses/{course['id']}/export")
    export_data = export_resp.json()

    file_bytes = json.dumps(export_data).encode()
    import_resp = await client.post(
        "/api/v1/courses/import",
        files={"file": ("c.json", io.BytesIO(file_bytes), "application/json")},
    )
    assert import_resp.status_code == 201
    imported = import_resp.json()
    tag_names = {t["name"] for t in imported["tags"]}
    assert tag_names == {"python", "ml"}


@pytest.mark.asyncio
async def test_import_invalid_json(client):
    """Import with malformed JSON returns 400."""
    await _ensure_user(client)
    file_bytes = b"not json at all"
    resp = await client.post(
        "/api/v1/courses/import",
        files={"file": ("bad.json", io.BytesIO(file_bytes), "application/json")},
    )
    assert resp.status_code == 400
    assert "Invalid JSON" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_import_invalid_schema(client):
    """Import with valid JSON but wrong schema returns 400."""
    await _ensure_user(client)
    file_bytes = json.dumps({"foo": "bar"}).encode()
    resp = await client.post(
        "/api/v1/courses/import",
        files={"file": ("bad.json", io.BytesIO(file_bytes), "application/json")},
    )
    assert resp.status_code == 400
    assert "Invalid course format" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_import_wrong_file_extension(client):
    """Import with non-JSON file returns 400."""
    await _ensure_user(client)
    resp = await client.post(
        "/api/v1/courses/import",
        files={"file": ("course.txt", io.BytesIO(b"{}"), "text/plain")},
    )
    assert resp.status_code == 400
    assert ".json" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_import_unsupported_version(client):
    """Import with wrong export_version returns 400."""
    await _ensure_user(client)
    data = {"export_version": 99, "title": "Test", "sections": []}
    file_bytes = json.dumps(data).encode()
    resp = await client.post(
        "/api/v1/courses/import",
        files={"file": ("c.json", io.BytesIO(file_bytes), "application/json")},
    )
    assert resp.status_code == 400
    assert "Unsupported export version" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_import_minimal_course(client):
    """Import with minimal required fields (title only)."""
    await _ensure_user(client)
    data = {"export_version": 1, "title": "Minimal Course"}
    file_bytes = json.dumps(data).encode()
    resp = await client.post(
        "/api/v1/courses/import",
        files={"file": ("c.json", io.BytesIO(file_bytes), "application/json")},
    )
    assert resp.status_code == 201
    assert resp.json()["title"] == "Minimal Course"
    assert resp.json()["section_count"] == 0


@pytest.mark.asyncio
async def test_export_excludes_user_data(client):
    """Export does not include user-specific fields (user_id, certificates, progress)."""
    await _ensure_user(client)
    course = await _create_course(client)
    resp = await client.get(f"/api/v1/courses/{course['id']}/export")
    data = resp.json()
    assert "user_id" not in data
    assert "id" not in data
    assert "certificates" not in data
    assert "progress" not in data
