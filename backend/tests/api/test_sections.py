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
    return resp


# ============================================================
# CREATE
# ============================================================
@pytest.mark.asyncio
async def test_create_section(client):
    await _ensure_user(client)
    course = await _create_course(client)
    resp = await _create_section(client, course["id"])
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Test Section"
    assert data["position"] == 0
    assert data["lessons"] == []


@pytest.mark.asyncio
async def test_create_section_with_description(client):
    await _ensure_user(client)
    course = await _create_course(client)
    resp = await _create_section(client, course["id"], description="Intro section")
    assert resp.status_code == 201
    assert resp.json()["description"] == "Intro section"


@pytest.mark.asyncio
async def test_create_section_auto_position(client):
    await _ensure_user(client)
    course = await _create_course(client)
    s1 = (await _create_section(client, course["id"], title="First")).json()
    s2 = (await _create_section(client, course["id"], title="Second")).json()
    assert s1["position"] == 0
    assert s2["position"] == 1


@pytest.mark.asyncio
async def test_create_section_missing_title(client):
    await _ensure_user(client)
    course = await _create_course(client)
    resp = await client.post(f"/api/v1/courses/{course['id']}/sections", json={})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_section_course_not_found(client):
    await _ensure_user(client)
    resp = await _create_section(client, "00000000-0000-0000-0000-000000000099")
    assert resp.status_code == 404


# ============================================================
# LIST
# ============================================================
@pytest.mark.asyncio
async def test_list_sections_empty(client):
    await _ensure_user(client)
    course = await _create_course(client)
    resp = await client.get(f"/api/v1/courses/{course['id']}/sections")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_list_sections(client):
    await _ensure_user(client)
    course = await _create_course(client)
    await _create_section(client, course["id"], title="A")
    await _create_section(client, course["id"], title="B")
    resp = await client.get(f"/api/v1/courses/{course['id']}/sections")
    assert resp.status_code == 200
    assert len(resp.json()) == 2


# ============================================================
# GET
# ============================================================
@pytest.mark.asyncio
async def test_get_section(client):
    await _ensure_user(client)
    course = await _create_course(client)
    section = (await _create_section(client, course["id"])).json()
    resp = await client.get(
        f"/api/v1/courses/{course['id']}/sections/{section['id']}"
    )
    assert resp.status_code == 200
    assert resp.json()["id"] == section["id"]


@pytest.mark.asyncio
async def test_get_section_not_found(client):
    await _ensure_user(client)
    course = await _create_course(client)
    resp = await client.get(
        f"/api/v1/courses/{course['id']}/sections/00000000-0000-0000-0000-000000000099"
    )
    assert resp.status_code == 404


# ============================================================
# UPDATE
# ============================================================
@pytest.mark.asyncio
async def test_update_section_title(client):
    await _ensure_user(client)
    course = await _create_course(client)
    section = (await _create_section(client, course["id"])).json()
    resp = await client.put(
        f"/api/v1/courses/{course['id']}/sections/{section['id']}",
        json={"title": "Updated"},
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "Updated"


@pytest.mark.asyncio
async def test_update_section_not_found(client):
    await _ensure_user(client)
    course = await _create_course(client)
    resp = await client.put(
        f"/api/v1/courses/{course['id']}/sections/00000000-0000-0000-0000-000000000099",
        json={"title": "Nope"},
    )
    assert resp.status_code == 404


# ============================================================
# DELETE
# ============================================================
@pytest.mark.asyncio
async def test_delete_section(client):
    await _ensure_user(client)
    course = await _create_course(client)
    section = (await _create_section(client, course["id"])).json()
    resp = await client.delete(
        f"/api/v1/courses/{course['id']}/sections/{section['id']}"
    )
    assert resp.status_code == 204
    # Verify gone
    get_resp = await client.get(
        f"/api/v1/courses/{course['id']}/sections/{section['id']}"
    )
    assert get_resp.status_code == 404


# ============================================================
# REORDER
# ============================================================
@pytest.mark.asyncio
async def test_reorder_sections(client):
    await _ensure_user(client)
    course = await _create_course(client)
    s1 = (await _create_section(client, course["id"], title="A")).json()
    s2 = (await _create_section(client, course["id"], title="B")).json()
    # Swap positions
    resp = await client.put(
        f"/api/v1/courses/{course['id']}/sections",
        json={"items": [{"id": s1["id"], "position": 1}, {"id": s2["id"], "position": 0}]},
    )
    assert resp.status_code == 200
    data = resp.json()
    positions = {item["id"]: item["position"] for item in data}
    assert positions[s1["id"]] == 1
    assert positions[s2["id"]] == 0


# ============================================================
# DUPLICATE
# ============================================================
@pytest.mark.asyncio
async def test_duplicate_section(client):
    await _ensure_user(client)
    course = await _create_course(client)
    section = (await _create_section(client, course["id"], title="Original")).json()
    resp = await client.post(
        f"/api/v1/courses/{course['id']}/sections/{section['id']}/duplicate"
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Original (Copy)"
    assert data["id"] != section["id"]


@pytest.mark.asyncio
async def test_duplicate_section_with_lessons(client):
    await _ensure_user(client)
    course = await _create_course(client)
    section = (await _create_section(client, course["id"])).json()
    # Add a lesson
    await client.post(
        f"/api/v1/sections/{section['id']}/lessons",
        json={"title": "Lesson 1"},
    )
    resp = await client.post(
        f"/api/v1/courses/{course['id']}/sections/{section['id']}/duplicate"
    )
    assert resp.status_code == 201
    assert len(resp.json()["lessons"]) == 1


# ============================================================
# SECTION LIMIT (50)
# ============================================================
@pytest.mark.asyncio
async def test_section_limit(client):
    await _ensure_user(client)
    course = await _create_course(client)
    for i in range(50):
        resp = await _create_section(client, course["id"], title=f"Section {i}")
        assert resp.status_code == 201
    resp = await _create_section(client, course["id"], title="Section 51")
    assert resp.status_code == 400
    assert "Maximum" in resp.json()["detail"]
