import pytest


# --- Helper ---
async def _ensure_user(client):
    """Hit GET /auth/me so the single-user row exists."""
    await client.get("/api/v1/auth/me")


async def _create_course(client, **overrides):
    payload = {"title": "Test Course", **overrides}
    resp = await client.post("/api/v1/courses", json=payload)
    return resp


# ============================================================
# CREATE
# ============================================================
@pytest.mark.asyncio
async def test_create_course(client):
    await _ensure_user(client)
    resp = await _create_course(client)
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Test Course"
    assert data["status"] == "draft"
    assert data["is_deleted"] is False
    assert data["tags"] == []


@pytest.mark.asyncio
async def test_create_course_with_tags(client):
    await _ensure_user(client)
    resp = await _create_course(client, tags=["python", "ai"])
    assert resp.status_code == 201
    tag_names = sorted(t["name"] for t in resp.json()["tags"])
    assert tag_names == ["ai", "python"]


@pytest.mark.asyncio
async def test_create_course_missing_title(client):
    await _ensure_user(client)
    resp = await client.post("/api/v1/courses", json={})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_course_title_too_long(client):
    await _ensure_user(client)
    resp = await _create_course(client, title="x" * 201)
    assert resp.status_code == 422


# ============================================================
# LIST
# ============================================================
@pytest.mark.asyncio
async def test_list_courses_empty(client):
    await _ensure_user(client)
    resp = await client.get("/api/v1/courses")
    assert resp.status_code == 200
    data = resp.json()
    assert data["items"] == []
    assert data["total"] == 0


@pytest.mark.asyncio
async def test_list_courses(client):
    await _ensure_user(client)
    await _create_course(client, title="Course A")
    await _create_course(client, title="Course B")
    resp = await client.get("/api/v1/courses")
    assert resp.status_code == 200
    assert resp.json()["total"] == 2


@pytest.mark.asyncio
async def test_list_courses_filter_by_status(client):
    await _ensure_user(client)
    create_resp = await _create_course(client, title="Draft Course")
    course_id = create_resp.json()["id"]
    # Mark as ready
    await client.put(f"/api/v1/courses/{course_id}", json={"status": "ready"})
    await _create_course(client, title="Still Draft")

    resp = await client.get("/api/v1/courses", params={"status": "ready"})
    assert resp.json()["total"] == 1
    assert resp.json()["items"][0]["title"] == "Draft Course"


@pytest.mark.asyncio
async def test_list_courses_search(client):
    await _ensure_user(client)
    await _create_course(client, title="Python Mastery")
    await _create_course(client, title="Rust Basics")

    resp = await client.get("/api/v1/courses", params={"search": "python"})
    assert resp.json()["total"] == 1
    assert resp.json()["items"][0]["title"] == "Python Mastery"


# ============================================================
# GET SINGLE
# ============================================================
@pytest.mark.asyncio
async def test_get_course(client):
    await _ensure_user(client)
    create_resp = await _create_course(client)
    course_id = create_resp.json()["id"]
    resp = await client.get(f"/api/v1/courses/{course_id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == course_id


@pytest.mark.asyncio
async def test_get_course_not_found(client):
    await _ensure_user(client)
    resp = await client.get("/api/v1/courses/00000000-0000-0000-0000-000000000099")
    assert resp.status_code == 404


# ============================================================
# UPDATE
# ============================================================
@pytest.mark.asyncio
async def test_update_course_title(client):
    await _ensure_user(client)
    create_resp = await _create_course(client)
    course_id = create_resp.json()["id"]
    resp = await client.put(
        f"/api/v1/courses/{course_id}",
        json={"title": "Updated Title"},
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "Updated Title"


@pytest.mark.asyncio
async def test_update_course_tags(client):
    await _ensure_user(client)
    create_resp = await _create_course(client, tags=["old-tag"])
    course_id = create_resp.json()["id"]
    resp = await client.put(
        f"/api/v1/courses/{course_id}",
        json={"tags": ["new-tag", "extra"]},
    )
    assert resp.status_code == 200
    tag_names = sorted(t["name"] for t in resp.json()["tags"])
    assert tag_names == ["extra", "new-tag"]


@pytest.mark.asyncio
async def test_update_course_status(client):
    await _ensure_user(client)
    create_resp = await _create_course(client)
    course_id = create_resp.json()["id"]
    resp = await client.put(
        f"/api/v1/courses/{course_id}", json={"status": "ready"}
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "ready"


@pytest.mark.asyncio
async def test_update_deleted_course_blocked(client):
    await _ensure_user(client)
    create_resp = await _create_course(client)
    course_id = create_resp.json()["id"]
    await client.delete(f"/api/v1/courses/{course_id}")
    resp = await client.put(
        f"/api/v1/courses/{course_id}", json={"title": "Nope"}
    )
    assert resp.status_code == 400


# ============================================================
# SOFT DELETE
# ============================================================
@pytest.mark.asyncio
async def test_soft_delete_course(client):
    await _ensure_user(client)
    create_resp = await _create_course(client)
    course_id = create_resp.json()["id"]
    resp = await client.delete(f"/api/v1/courses/{course_id}")
    assert resp.status_code == 200
    assert resp.json()["is_deleted"] is True
    assert resp.json()["deleted_at"] is not None


@pytest.mark.asyncio
async def test_soft_delete_already_deleted(client):
    await _ensure_user(client)
    create_resp = await _create_course(client)
    course_id = create_resp.json()["id"]
    await client.delete(f"/api/v1/courses/{course_id}")
    resp = await client.delete(f"/api/v1/courses/{course_id}")
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_deleted_courses_not_in_list(client):
    await _ensure_user(client)
    create_resp = await _create_course(client)
    course_id = create_resp.json()["id"]
    await client.delete(f"/api/v1/courses/{course_id}")
    resp = await client.get("/api/v1/courses")
    assert resp.json()["total"] == 0


# ============================================================
# TRASH
# ============================================================
@pytest.mark.asyncio
async def test_list_trash(client):
    await _ensure_user(client)
    create_resp = await _create_course(client)
    course_id = create_resp.json()["id"]
    await client.delete(f"/api/v1/courses/{course_id}")
    resp = await client.get("/api/v1/courses/trash")
    assert resp.status_code == 200
    assert resp.json()["total"] == 1


# ============================================================
# RESTORE
# ============================================================
@pytest.mark.asyncio
async def test_restore_course(client):
    await _ensure_user(client)
    create_resp = await _create_course(client)
    course_id = create_resp.json()["id"]
    await client.delete(f"/api/v1/courses/{course_id}")
    resp = await client.post(f"/api/v1/courses/{course_id}/restore")
    assert resp.status_code == 200
    assert resp.json()["is_deleted"] is False


@pytest.mark.asyncio
async def test_restore_non_deleted(client):
    await _ensure_user(client)
    create_resp = await _create_course(client)
    course_id = create_resp.json()["id"]
    resp = await client.post(f"/api/v1/courses/{course_id}/restore")
    assert resp.status_code == 400


# ============================================================
# PERMANENT DELETE
# ============================================================
@pytest.mark.asyncio
async def test_permanent_delete(client):
    await _ensure_user(client)
    create_resp = await _create_course(client)
    course_id = create_resp.json()["id"]
    await client.delete(f"/api/v1/courses/{course_id}")
    resp = await client.delete(f"/api/v1/courses/{course_id}/permanent")
    assert resp.status_code == 204
    # Verify gone
    get_resp = await client.get(f"/api/v1/courses/{course_id}")
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_permanent_delete_not_in_trash(client):
    await _ensure_user(client)
    create_resp = await _create_course(client)
    course_id = create_resp.json()["id"]
    resp = await client.delete(f"/api/v1/courses/{course_id}/permanent")
    assert resp.status_code == 400


# ============================================================
# DUPLICATE
# ============================================================
@pytest.mark.asyncio
async def test_duplicate_course(client):
    await _ensure_user(client)
    create_resp = await _create_course(client, title="Original", tags=["tag1"])
    course_id = create_resp.json()["id"]
    resp = await client.post(f"/api/v1/courses/{course_id}/duplicate")
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Original (Copy)"
    assert data["status"] == "draft"
    assert len(data["tags"]) == 1


@pytest.mark.asyncio
async def test_duplicate_course_deep_copies_sections_and_lessons(client):
    """Duplicate copies all sections, lessons, and reference links."""
    await _ensure_user(client)
    # Create course with sections, lessons, and reference links
    create_resp = await _create_course(client, title="Full Course", tags=["deep"])
    course_id = create_resp.json()["id"]

    sec_resp = await client.post(
        f"/api/v1/courses/{course_id}/sections", json={"title": "Section A"}
    )
    assert sec_resp.status_code == 201
    section_id = sec_resp.json()["id"]

    les_resp = await client.post(
        f"/api/v1/sections/{section_id}/lessons",
        json={"title": "Lesson 1"},
    )
    assert les_resp.status_code == 201
    lesson_id = les_resp.json()["id"]

    # Update lesson with content
    await client.put(
        f"/api/v1/sections/{section_id}/lessons/{lesson_id}",
        json={
            "youtube_url": "https://youtube.com/watch?v=deep",
            "notes_markdown": "# Deep copy notes",
        },
    )

    # Add reference link
    ref_resp = await client.post(
        f"/api/v1/sections/{section_id}/lessons/{lesson_id}/references",
        json={"url": "https://example.com/deep", "title": "Deep Link"},
    )
    assert ref_resp.status_code == 201

    # Add a second section
    sec2_resp = await client.post(
        f"/api/v1/courses/{course_id}/sections", json={"title": "Section B"}
    )
    assert sec2_resp.status_code == 201

    # Duplicate
    dup_resp = await client.post(f"/api/v1/courses/{course_id}/duplicate")
    assert dup_resp.status_code == 201
    dup = dup_resp.json()
    assert dup["title"] == "Full Course (Copy)"
    assert dup["id"] != course_id
    assert dup["section_count"] == 2
    assert dup["lesson_count"] == 1

    # Fetch the duplicated sections
    new_course_id = dup["id"]
    sections_resp = await client.get(f"/api/v1/courses/{new_course_id}/sections")
    assert sections_resp.status_code == 200
    sections = sections_resp.json()
    assert len(sections) == 2
    # Sections should keep original titles (not "(Copy)")
    assert sections[0]["title"] == "Section A"
    assert sections[1]["title"] == "Section B"

    # IDs should be new
    assert sections[0]["id"] != section_id

    # Verify lesson was deep-copied (lessons are nested in section response)
    assert len(sections[0]["lessons"]) == 1
    lesson = sections[0]["lessons"][0]
    assert lesson["title"] == "Lesson 1"
    assert lesson["id"] != lesson_id
    assert lesson["youtube_url"] == "https://youtube.com/watch?v=deep"
    assert "# Deep copy notes" in lesson["notes_markdown"]

    # Verify reference link was deep-copied
    assert len(lesson["reference_links"]) == 1
    assert lesson["reference_links"][0]["url"] == "https://example.com/deep"


# ============================================================
# COURSE LIMIT (50)
# ============================================================
@pytest.mark.asyncio
async def test_course_limit(client):
    await _ensure_user(client)
    for i in range(50):
        resp = await _create_course(client, title=f"Course {i}")
        assert resp.status_code == 201
    resp = await _create_course(client, title="Course 51")
    assert resp.status_code == 400
    assert "Maximum" in resp.json()["detail"]
