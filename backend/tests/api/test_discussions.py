"""Tests for discussion (course chat) endpoints."""

import pytest


# --- Helpers ---
async def _ensure_user(client):
    await client.get("/api/v1/auth/me")


async def _create_course(client, **overrides):
    payload = {"title": "Discussion Course", **overrides}
    resp = await client.post("/api/v1/courses", json=payload)
    assert resp.status_code == 201
    return resp.json()


# ============================================================
# GET /discussions/{course_id}  – list messages
# ============================================================
@pytest.mark.asyncio
async def test_list_messages_empty(client):
    """Empty discussion returns no messages."""
    await _ensure_user(client)
    course = await _create_course(client)

    resp = await client.get(f"/api/v1/discussions/{course['id']}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["items"] == []
    assert data["has_more"] is False


# ============================================================
# POST /discussions/{course_id}  – post a message
# ============================================================
@pytest.mark.asyncio
async def test_post_message(client):
    """Can post a discussion message."""
    await _ensure_user(client)
    course = await _create_course(client)

    resp = await client.post(
        f"/api/v1/discussions/{course['id']}",
        json={"content": "Hello, world!"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["content"] == "Hello, world!"
    assert data["course_id"] == course["id"]


@pytest.mark.asyncio
async def test_post_message_empty_content(client):
    """Empty content should be rejected."""
    await _ensure_user(client)
    course = await _create_course(client)

    resp = await client.post(
        f"/api/v1/discussions/{course['id']}",
        json={"content": ""},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_post_message_too_long(client):
    """Content over 5000 chars should be rejected."""
    await _ensure_user(client)
    course = await _create_course(client)

    resp = await client.post(
        f"/api/v1/discussions/{course['id']}",
        json={"content": "x" * 5001},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_post_message_with_reply(client):
    """Can reply to another message."""
    await _ensure_user(client)
    course = await _create_course(client)

    # Post original
    original = await client.post(
        f"/api/v1/discussions/{course['id']}",
        json={"content": "Original message"},
    )
    msg_id = original.json()["id"]

    # Reply
    reply = await client.post(
        f"/api/v1/discussions/{course['id']}",
        json={"content": "Reply here", "reply_to_id": msg_id},
    )
    assert reply.status_code == 201
    assert reply.json()["reply_to_id"] == msg_id


@pytest.mark.asyncio
async def test_list_messages_after_posting(client):
    """Messages appear in listing after posting."""
    await _ensure_user(client)
    course = await _create_course(client)

    await client.post(
        f"/api/v1/discussions/{course['id']}",
        json={"content": "First message"},
    )
    await client.post(
        f"/api/v1/discussions/{course['id']}",
        json={"content": "Second message"},
    )

    resp = await client.get(f"/api/v1/discussions/{course['id']}")
    assert resp.status_code == 200
    assert len(resp.json()["items"]) == 2


@pytest.mark.asyncio
async def test_list_messages_pagination(client):
    """Limit parameter caps the returned messages."""
    await _ensure_user(client)
    course = await _create_course(client)

    for i in range(5):
        await client.post(
            f"/api/v1/discussions/{course['id']}",
            json={"content": f"Message {i}"},
        )

    resp = await client.get(
        f"/api/v1/discussions/{course['id']}", params={"limit": 2}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["items"]) == 2
    assert data["has_more"] is True


@pytest.mark.asyncio
async def test_post_message_nonexistent_course(client):
    """Posting to a non-existent course returns 404."""
    await _ensure_user(client)
    resp = await client.post(
        "/api/v1/discussions/00000000-0000-0000-0000-000000000099",
        json={"content": "Hello?"},
    )
    assert resp.status_code == 404
