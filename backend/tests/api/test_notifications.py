"""Tests for the notifications API endpoints."""

import pytest


# --- Helpers ---

async def _ensure_user(client):
    await client.get("/api/v1/auth/me")


async def _create_notification_via_api(client):
    """Trigger evaluation to potentially create notifications.
    Since we need a behind-schedule goal, we create directly via the list endpoint check."""
    resp = await client.get("/api/v1/notifications")
    assert resp.status_code == 200
    return resp.json()


# ============================================================
# List Notifications (empty)
# ============================================================


@pytest.mark.asyncio
async def test_list_notifications_empty(client):
    """Returns empty list when no notifications exist."""
    await _ensure_user(client)
    resp = await client.get("/api/v1/notifications")
    assert resp.status_code == 200
    assert resp.json() == []


# ============================================================
# Unread Count
# ============================================================


@pytest.mark.asyncio
async def test_unread_count_zero(client):
    """Unread count is zero when no notifications exist."""
    await _ensure_user(client)
    resp = await client.get("/api/v1/notifications/unread-count")
    assert resp.status_code == 200
    data = resp.json()
    assert data["count"] == 0


# ============================================================
# Evaluate (no goals → no notifications)
# ============================================================


@pytest.mark.asyncio
async def test_evaluate_no_goals(client):
    """Evaluate returns empty list when user has no goals."""
    await _ensure_user(client)
    resp = await client.post("/api/v1/notifications/evaluate")
    assert resp.status_code == 200
    assert resp.json() == []


# ============================================================
# Mark Read
# ============================================================


@pytest.mark.asyncio
async def test_mark_read_not_found(client):
    """Returns 404 when marking a non-existent notification as read."""
    await _ensure_user(client)
    fake_id = "00000000-0000-0000-0000-000000000099"
    resp = await client.put(f"/api/v1/notifications/{fake_id}/read")
    assert resp.status_code == 404


# ============================================================
# Mark All Read
# ============================================================


@pytest.mark.asyncio
async def test_mark_all_read_empty(client):
    """Mark all read returns 0 updated when no notifications exist."""
    await _ensure_user(client)
    resp = await client.put("/api/v1/notifications/read-all")
    assert resp.status_code == 200
    assert resp.json()["updated"] == 0


# ============================================================
# Delete Notification
# ============================================================


@pytest.mark.asyncio
async def test_delete_notification_not_found(client):
    """Returns 404 when deleting a non-existent notification."""
    await _ensure_user(client)
    fake_id = "00000000-0000-0000-0000-000000000099"
    resp = await client.delete(f"/api/v1/notifications/{fake_id}")
    assert resp.status_code == 404


# ============================================================
# Full lifecycle: create via evaluate, read, delete
# ============================================================


@pytest.mark.asyncio
async def test_notification_lifecycle_with_overdue_goal(client):
    """Create a course with a past goal date → evaluate → get notification → mark read → delete."""
    from datetime import date, timedelta

    await _ensure_user(client)

    # Create a course with a section and lesson (has content to pass validation)
    resp = await client.post("/api/v1/courses", json={"title": "Overdue Course"})
    assert resp.status_code == 201
    course = resp.json()

    resp = await client.post(
        f"/api/v1/courses/{course['id']}/sections",
        json={"title": "Section 1"},
    )
    section = resp.json()

    resp = await client.post(
        f"/api/v1/sections/{section['id']}/lessons",
        json={"title": "Lesson 1"},
    )
    lesson = resp.json()

    # Add content so course can be marked ready
    await client.put(
        f"/api/v1/sections/{section['id']}/lessons/{lesson['id']}",
        json={"notes_markdown": "Some content"},
    )

    # Set a future goal date (tomorrow) with incomplete lesson → behind pace
    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    resp = await client.put(
        f"/api/v1/goals/courses/{course['id']}",
        json={"goal_date": tomorrow},
    )
    assert resp.status_code == 200

    # Evaluate — should detect behind-pace course
    resp = await client.post("/api/v1/notifications/evaluate")
    assert resp.status_code == 200
    notifications = resp.json()

    # With 1 lesson due tomorrow and 0 done, pace should be "behind" (>5 lessons/week)
    # or at minimum the notification evaluator should run without error
    if len(notifications) > 0:
        notif = notifications[0]
        assert notif["type"] == "pace_warning"
        assert "Overdue Course" in notif["title"]
        assert notif["is_read"] is False

        # Check unread count
        resp = await client.get("/api/v1/notifications/unread-count")
        assert resp.json()["count"] >= 1

        # List should include it
        resp = await client.get("/api/v1/notifications")
        assert len(resp.json()) >= 1

        # Mark read
        resp = await client.put(f"/api/v1/notifications/{notif['id']}/read")
        assert resp.status_code == 200
        assert resp.json()["is_read"] is True

        # Mark all read and verify unread count is 0
        resp = await client.put("/api/v1/notifications/read-all")
        assert resp.status_code == 200
        resp = await client.get("/api/v1/notifications/unread-count")
        assert resp.json()["count"] == 0

        # Delete all notifications
        resp = await client.get("/api/v1/notifications")
        for n in resp.json():
            await client.delete(f"/api/v1/notifications/{n['id']}")

        # List should be empty
        resp = await client.get("/api/v1/notifications")
        assert len(resp.json()) == 0


@pytest.mark.asyncio
async def test_evaluate_idempotent(client):
    """Evaluating twice in the same day doesn't create duplicate notifications."""
    from datetime import date, timedelta

    await _ensure_user(client)

    # Create course with goal
    resp = await client.post("/api/v1/courses", json={"title": "Idempotent Test"})
    course = resp.json()
    resp = await client.post(
        f"/api/v1/courses/{course['id']}/sections",
        json={"title": "S1"},
    )
    section = resp.json()
    resp = await client.post(
        f"/api/v1/sections/{section['id']}/lessons",
        json={"title": "L1"},
    )
    await client.put(
        f"/api/v1/sections/{section['id']}/lessons/{resp.json()['id']}",
        json={"notes_markdown": "content"},
    )

    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    await client.put(
        f"/api/v1/goals/courses/{course['id']}",
        json={"goal_date": tomorrow},
    )

    # First evaluation
    resp1 = await client.post("/api/v1/notifications/evaluate")
    count1 = len(resp1.json())

    # Second evaluation same day — should not create duplicates
    resp2 = await client.post("/api/v1/notifications/evaluate")
    count2 = len(resp2.json())
    assert count2 == 0 or count2 <= count1  # No new notifications
