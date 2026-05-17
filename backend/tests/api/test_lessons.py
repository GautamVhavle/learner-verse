import asyncio

import pytest

from app.services.playlist_service import PlaylistResult, PlaylistVideo


# --- Helpers ---
async def _ensure_user(client):
    await client.get("/api/v1/auth/me")


async def _create_course(client):
    resp = await client.post("/api/v1/courses", json={"title": "Test Course"})
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
    return resp


# ============================================================
# CREATE
# ============================================================
@pytest.mark.asyncio
async def test_create_lesson(client):
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    resp = await _create_lesson(client, section["id"])
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Test Lesson"
    assert data["position"] == 0
    assert data["youtube_url"] is None


@pytest.mark.asyncio
async def test_create_lesson_auto_position(client):
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    l1 = (await _create_lesson(client, section["id"], title="L1")).json()
    l2 = (await _create_lesson(client, section["id"], title="L2")).json()
    assert l1["position"] == 0
    assert l2["position"] == 1


@pytest.mark.asyncio
async def test_create_lesson_missing_title(client):
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    resp = await client.post(f"/api/v1/sections/{section['id']}/lessons", json={})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_lesson_section_not_found(client):
    await _ensure_user(client)
    resp = await _create_lesson(client, "00000000-0000-0000-0000-000000000099")
    assert resp.status_code == 404


# ============================================================
# GET
# ============================================================
@pytest.mark.asyncio
async def test_get_lesson(client):
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    lesson = (await _create_lesson(client, section["id"])).json()
    resp = await client.get(
        f"/api/v1/sections/{section['id']}/lessons/{lesson['id']}"
    )
    assert resp.status_code == 200
    assert resp.json()["id"] == lesson["id"]


@pytest.mark.asyncio
async def test_get_lesson_not_found(client):
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    resp = await client.get(
        f"/api/v1/sections/{section['id']}/lessons/00000000-0000-0000-0000-000000000099"
    )
    assert resp.status_code == 404


# ============================================================
# UPDATE
# ============================================================
@pytest.mark.asyncio
async def test_update_lesson_title(client):
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    lesson = (await _create_lesson(client, section["id"])).json()
    resp = await client.put(
        f"/api/v1/sections/{section['id']}/lessons/{lesson['id']}",
        json={"title": "Updated"},
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "Updated"


@pytest.mark.asyncio
async def test_update_lesson_not_found(client):
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    resp = await client.put(
        f"/api/v1/sections/{section['id']}/lessons/00000000-0000-0000-0000-000000000099",
        json={"title": "Nope"},
    )
    assert resp.status_code == 404


# ============================================================
# DELETE
# ============================================================
@pytest.mark.asyncio
async def test_delete_lesson(client):
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    lesson = (await _create_lesson(client, section["id"])).json()
    resp = await client.delete(
        f"/api/v1/sections/{section['id']}/lessons/{lesson['id']}"
    )
    assert resp.status_code == 204
    get_resp = await client.get(
        f"/api/v1/sections/{section['id']}/lessons/{lesson['id']}"
    )
    assert get_resp.status_code == 404


# ============================================================
# REORDER
# ============================================================
@pytest.mark.asyncio
async def test_reorder_lessons(client):
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    l1 = (await _create_lesson(client, section["id"], title="A")).json()
    l2 = (await _create_lesson(client, section["id"], title="B")).json()
    resp = await client.put(
        f"/api/v1/sections/{section['id']}/lessons",
        json={"items": [{"id": l1["id"], "position": 1}, {"id": l2["id"], "position": 0}]},
    )
    assert resp.status_code == 200
    data = resp.json()
    positions = {item["id"]: item["position"] for item in data}
    assert positions[l1["id"]] == 1
    assert positions[l2["id"]] == 0


# ============================================================
# MOVE
# ============================================================
@pytest.mark.asyncio
async def test_move_lesson_between_sections(client):
    await _ensure_user(client)
    course = await _create_course(client)
    s1 = await _create_section(client, course["id"], title="Section A")
    s2 = await _create_section(client, course["id"], title="Section B")
    lesson = (await _create_lesson(client, s1["id"])).json()
    resp = await client.post(
        f"/api/v1/sections/{s1['id']}/lessons/{lesson['id']}/move",
        json={"target_section_id": s2["id"], "position": 0},
    )
    assert resp.status_code == 200
    assert resp.json()["section_id"] == s2["id"]


# ============================================================
# DUPLICATE
# ============================================================
@pytest.mark.asyncio
async def test_duplicate_lesson(client):
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    lesson = (await _create_lesson(client, section["id"], title="Original")).json()
    resp = await client.post(
        f"/api/v1/sections/{section['id']}/lessons/{lesson['id']}/duplicate"
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Original (Copy)"
    assert data["id"] != lesson["id"]


# ============================================================
# LESSON LIMIT (50)
# ============================================================
@pytest.mark.asyncio
async def test_lesson_limit(client):
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    for i in range(150):
        resp = await _create_lesson(client, section["id"], title=f"Lesson {i}")
        assert resp.status_code == 201
    resp = await _create_lesson(client, section["id"], title="Lesson 151")
    assert resp.status_code == 400
    assert "Maximum" in resp.json()["detail"]


# ============================================================
# PLAYLIST IMPORT (BACKGROUND TASK)
# ============================================================
async def _poll_import_task(client, section_id, task_id, max_attempts=50):
    for _ in range(max_attempts):
        resp = await client.get(
            f"/api/v1/sections/{section_id}/lessons/import-playlist/{task_id}"
        )
        assert resp.status_code == 200
        data = resp.json()
        if data["status"] in {"done", "failed"}:
            return data
        await asyncio.sleep(0.02)
    pytest.fail("Playlist import task did not finish in time")


@pytest.mark.asyncio
async def test_import_playlist_runs_in_background(client, monkeypatch):
    from app.services import playlist_import_task_service

    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])

    async def fake_extract_playlist(_url):
        return PlaylistResult(
            playlist_title="Backend Playlist",
            videos=[
                PlaylistVideo(
                    video_id="vid-1",
                    title="Video 1",
                    thumbnail_url="https://img.youtube.com/vi/vid-1/hqdefault.jpg",
                    channel_name="Channel One",
                    youtube_url="https://www.youtube.com/watch?v=vid-1",
                    position=0,
                ),
                PlaylistVideo(
                    video_id="vid-2",
                    title="Video 2",
                    thumbnail_url="https://img.youtube.com/vi/vid-2/hqdefault.jpg",
                    channel_name="Channel Two",
                    youtube_url="https://www.youtube.com/watch?v=vid-2",
                    position=1,
                ),
            ],
        )

    monkeypatch.setattr(playlist_import_task_service, "extract_playlist", fake_extract_playlist)

    resp = await client.post(
        f"/api/v1/sections/{section['id']}/lessons/import-playlist",
        json={"playlist_url": "https://www.youtube.com/playlist?list=test"},
    )
    assert resp.status_code == 202
    task_id = resp.json()["task_id"]

    final = await _poll_import_task(client, section["id"], task_id)
    assert final["status"] == "done"
    assert final["playlist_title"] == "Backend Playlist"
    assert final["imported_count"] == 2

    sections_resp = await client.get(f"/api/v1/courses/{course['id']}/sections")
    assert sections_resp.status_code == 200
    lessons = sections_resp.json()[0]["lessons"]
    assert [lesson["title"] for lesson in lessons] == ["Video 1", "Video 2"]
    assert [lesson["position"] for lesson in lessons] == [0, 1]


@pytest.mark.asyncio
async def test_import_playlist_surfaces_background_failure(client, monkeypatch):
    from app.services import playlist_import_task_service

    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])

    async def fake_extract_playlist(_url):
        raise ValueError("Invalid YouTube playlist URL.")

    monkeypatch.setattr(playlist_import_task_service, "extract_playlist", fake_extract_playlist)

    resp = await client.post(
        f"/api/v1/sections/{section['id']}/lessons/import-playlist",
        json={"playlist_url": "https://www.youtube.com/playlist?list=broken"},
    )
    assert resp.status_code == 202
    task_id = resp.json()["task_id"]

    final = await _poll_import_task(client, section["id"], task_id)
    assert final["status"] == "failed"
    assert "Invalid YouTube playlist URL." in final["error"]


# ============================================================
# NOTES MARKDOWN
# ============================================================
@pytest.mark.asyncio
async def test_update_lesson_notes_markdown(client):
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    lesson = (await _create_lesson(client, section["id"])).json()
    resp = await client.put(
        f"/api/v1/sections/{section['id']}/lessons/{lesson['id']}",
        json={"notes_markdown": "# Hello\nSome **bold** text"},
    )
    assert resp.status_code == 200
    assert resp.json()["notes_markdown"] == "# Hello\nSome **bold** text"


@pytest.mark.asyncio
async def test_update_notes_markdown_too_long(client):
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    lesson = (await _create_lesson(client, section["id"])).json()
    resp = await client.put(
        f"/api/v1/sections/{section['id']}/lessons/{lesson['id']}",
        json={"notes_markdown": "x" * 50001},
    )
    assert resp.status_code == 422


# ============================================================
# REFERENCE LINKS
# ============================================================
async def _add_ref_link(client, section_id, lesson_id, **overrides):
    payload = {
        "url": "https://example.com",
        "title": "Example",
        "description": "Desc",
        "domain": "example.com",
        **overrides,
    }
    return await client.post(
        f"/api/v1/sections/{section_id}/lessons/{lesson_id}/references",
        json=payload,
    )


@pytest.mark.asyncio
async def test_add_reference_link(client):
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    lesson = (await _create_lesson(client, section["id"])).json()
    resp = await _add_ref_link(client, section["id"], lesson["id"])
    assert resp.status_code == 201
    data = resp.json()
    assert data["url"] == "https://example.com"
    assert data["title"] == "Example"
    assert data["position"] == 0


@pytest.mark.asyncio
async def test_reference_links_in_lesson_response(client):
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    lesson = (await _create_lesson(client, section["id"])).json()
    await _add_ref_link(client, section["id"], lesson["id"], url="https://a.com")
    await _add_ref_link(client, section["id"], lesson["id"], url="https://b.com")
    resp = await client.get(
        f"/api/v1/sections/{section['id']}/lessons/{lesson['id']}"
    )
    assert resp.status_code == 200
    links = resp.json()["reference_links"]
    assert len(links) == 2


@pytest.mark.asyncio
async def test_delete_reference_link(client):
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    lesson = (await _create_lesson(client, section["id"])).json()
    link = (await _add_ref_link(client, section["id"], lesson["id"])).json()
    resp = await client.delete(
        f"/api/v1/sections/{section['id']}/lessons/{lesson['id']}/references/{link['id']}"
    )
    assert resp.status_code == 204
    # Verify removed
    lesson_resp = await client.get(
        f"/api/v1/sections/{section['id']}/lessons/{lesson['id']}"
    )
    assert len(lesson_resp.json()["reference_links"]) == 0


@pytest.mark.asyncio
async def test_reference_links_limit(client):
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    lesson = (await _create_lesson(client, section["id"])).json()
    for i in range(20):
        resp = await _add_ref_link(
            client, section["id"], lesson["id"], url=f"https://example.com/{i}"
        )
        assert resp.status_code == 201
    resp = await _add_ref_link(client, section["id"], lesson["id"], url="https://over.com")
    assert resp.status_code == 400
    assert "Maximum" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_duplicate_lesson_copies_reference_links(client):
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    lesson = (await _create_lesson(client, section["id"])).json()
    await _add_ref_link(client, section["id"], lesson["id"])
    resp = await client.post(
        f"/api/v1/sections/{section['id']}/lessons/{lesson['id']}/duplicate"
    )
    assert resp.status_code == 201
    dup = resp.json()
    # Fetch the duplicated lesson to verify reference links were copied
    get_resp = await client.get(
        f"/api/v1/sections/{section['id']}/lessons/{dup['id']}"
    )
    assert len(get_resp.json()["reference_links"]) == 1
