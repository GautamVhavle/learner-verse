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


async def _complete_lesson(client, lesson_id):
    resp = await client.put(
        f"/api/v1/progress/lessons/{lesson_id}",
        json={"completed": True},
    )
    assert resp.status_code == 200


async def _setup_completed_course(client, num_sections=1, lessons_per_section=2):
    """Create a course and mark all lessons complete. Returns course dict."""
    await _ensure_user(client)
    course = await _create_course(client)
    for _ in range(num_sections):
        section = await _create_section(client, course["id"])
        for _ in range(lessons_per_section):
            lesson = await _create_lesson(client, section["id"])
            await _complete_lesson(client, lesson["id"])
    return course


# ============================================================
# Generate Certificate
# ============================================================


@pytest.mark.asyncio
async def test_generate_certificate_success(client):
    """Can generate a certificate for a 100% complete course."""
    course = await _setup_completed_course(client)

    resp = await client.post(f"/api/v1/certificates/courses/{course['id']}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["course_id"] == course["id"]
    assert data["course_title"] == "Test Course"
    assert data["lessons_count"] == 2
    assert data["sections_count"] == 1
    assert data["certificate_uid"].startswith("LV-")
    assert data["completed_at"] is not None


@pytest.mark.asyncio
async def test_generate_certificate_not_complete(client):
    """Cannot generate certificate if course is not 100% done."""
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    lesson1 = await _create_lesson(client, section["id"])
    await _create_lesson(client, section["id"])

    # Complete only one lesson
    await _complete_lesson(client, lesson1["id"])

    resp = await client.post(f"/api/v1/certificates/courses/{course['id']}")
    assert resp.status_code == 400
    assert "100%" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_generate_certificate_no_lessons(client):
    """Cannot generate certificate for a course with no lessons."""
    await _ensure_user(client)
    course = await _create_course(client)

    resp = await client.post(f"/api/v1/certificates/courses/{course['id']}")
    assert resp.status_code == 400
    assert "no lessons" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_generate_certificate_idempotent(client):
    """Generating certificate twice returns the same certificate."""
    course = await _setup_completed_course(client)

    resp1 = await client.post(f"/api/v1/certificates/courses/{course['id']}")
    resp2 = await client.post(f"/api/v1/certificates/courses/{course['id']}")
    assert resp1.status_code == 200
    assert resp2.status_code == 200
    assert resp1.json()["id"] == resp2.json()["id"]
    assert resp1.json()["certificate_uid"] == resp2.json()["certificate_uid"]


# ============================================================
# List & Get Certificates
# ============================================================


@pytest.mark.asyncio
async def test_list_certificates_empty(client):
    """Empty list when no certificates earned."""
    await _ensure_user(client)
    resp = await client.get("/api/v1/certificates")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_list_certificates_with_data(client):
    """Lists all certificates for the user."""
    course = await _setup_completed_course(client)
    await client.post(f"/api/v1/certificates/courses/{course['id']}")

    resp = await client.get("/api/v1/certificates")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["course_title"] == "Test Course"


@pytest.mark.asyncio
async def test_get_certificate_by_id(client):
    """Can fetch a single certificate by ID."""
    course = await _setup_completed_course(client)
    gen_resp = await client.post(f"/api/v1/certificates/courses/{course['id']}")
    cert_id = gen_resp.json()["id"]

    resp = await client.get(f"/api/v1/certificates/{cert_id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == cert_id


@pytest.mark.asyncio
async def test_get_certificate_not_found(client):
    """404 for non-existent certificate."""
    await _ensure_user(client)
    resp = await client.get("/api/v1/certificates/00000000-0000-0000-0000-000000000099")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_certificate_by_course(client):
    """Can fetch certificate by course ID."""
    course = await _setup_completed_course(client)
    await client.post(f"/api/v1/certificates/courses/{course['id']}")

    resp = await client.get(f"/api/v1/certificates/courses/{course['id']}")
    assert resp.status_code == 200
    assert resp.json()["course_id"] == course["id"]


@pytest.mark.asyncio
async def test_get_certificate_by_course_none(client):
    """Returns null when no certificate exists for the course."""
    await _ensure_user(client)
    course = await _create_course(client)

    resp = await client.get(f"/api/v1/certificates/courses/{course['id']}")
    assert resp.status_code == 200
    assert resp.json() is None


# ============================================================
# Shareable Certificate Link
# ============================================================


@pytest.mark.asyncio
async def test_share_certificate_by_uid(client):
    """Can fetch a certificate via the public share endpoint."""
    course = await _setup_completed_course(client)
    gen_resp = await client.post(f"/api/v1/certificates/courses/{course['id']}")
    cert_uid = gen_resp.json()["certificate_uid"]

    resp = await client.get(f"/api/v1/certificates/share/{cert_uid}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["certificate_uid"] == cert_uid
    assert data["course_title"] == "Test Course"


@pytest.mark.asyncio
async def test_share_certificate_not_found(client):
    """404 for non-existent certificate UID."""
    resp = await client.get("/api/v1/certificates/share/LV-9999-INVALID")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_certificate_multi_section(client):
    """Certificate correctly counts multiple sections."""
    course = await _setup_completed_course(client, num_sections=3, lessons_per_section=2)

    resp = await client.post(f"/api/v1/certificates/courses/{course['id']}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["sections_count"] == 3
    assert data["lessons_count"] == 6
