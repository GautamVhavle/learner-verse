import pytest
from datetime import date, timedelta

from app.services.progress_service import ProgressService


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


# ============================================================
# Unit tests: compute_pace
# ============================================================


def test_pace_on_track():
    """Moderate remaining work with enough time → on_track."""
    today = date(2026, 3, 20)
    goal = date(2026, 4, 20)  # 31 days away
    result = ProgressService.compute_pace(
        goal_date=goal, total_lessons=10, completed_lessons=5, today=today
    )
    assert result.pace_status == "on_track"
    assert result.days_remaining == 31
    assert result.lessons_per_week_needed > 0


def test_pace_behind():
    """Too many lessons left with too little time → behind."""
    today = date(2026, 3, 20)
    goal = date(2026, 3, 23)  # only 3 days
    result = ProgressService.compute_pace(
        goal_date=goal, total_lessons=20, completed_lessons=2, today=today
    )
    assert result.pace_status == "behind"
    assert result.lessons_per_week_needed > 5


def test_pace_ahead():
    """Most work done with plenty of time → ahead."""
    today = date(2026, 3, 20)
    goal = date(2026, 5, 20)  # 61 days
    result = ProgressService.compute_pace(
        goal_date=goal, total_lessons=10, completed_lessons=8, today=today
    )
    assert result.pace_status == "ahead"


def test_pace_completed_before_goal():
    """Course completed before the goal date → completed + early days."""
    today = date(2026, 3, 20)
    goal = date(2026, 4, 20)
    result = ProgressService.compute_pace(
        goal_date=goal, total_lessons=10, completed_lessons=10, today=today
    )
    assert result.pace_status == "completed"
    assert result.completed_early_by_days == 31
    assert result.lessons_per_week_needed == 0


def test_pace_completed_after_goal():
    """Course completed after the goal date → completed, no early days."""
    today = date(2026, 4, 25)
    goal = date(2026, 4, 20)
    result = ProgressService.compute_pace(
        goal_date=goal, total_lessons=10, completed_lessons=10, today=today
    )
    assert result.pace_status == "completed"
    assert result.completed_early_by_days is None


def test_pace_overdue():
    """Goal date passed but course not done → overdue."""
    today = date(2026, 4, 25)
    goal = date(2026, 4, 20)
    result = ProgressService.compute_pace(
        goal_date=goal, total_lessons=10, completed_lessons=5, today=today
    )
    assert result.pace_status == "overdue"
    assert result.days_remaining < 0


def test_pace_no_progress():
    """No lessons completed → still on_track if enough time."""
    today = date(2026, 3, 20)
    goal = date(2026, 6, 20)  # 92 days
    result = ProgressService.compute_pace(
        goal_date=goal, total_lessons=10, completed_lessons=0, today=today
    )
    assert result.pace_status == "on_track"


# ============================================================
# API tests: Goals endpoints
# ============================================================


@pytest.mark.asyncio
async def test_set_goal(client):
    """Can set a goal date on a course."""
    await _ensure_user(client)
    course = await _create_course(client)
    goal_date = (date.today() + timedelta(days=30)).isoformat()

    resp = await client.put(
        f"/api/v1/goals/courses/{course['id']}",
        json={"goal_date": goal_date},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["goal_date"] == goal_date
    assert data["course_title"] == "Test Course"


@pytest.mark.asyncio
async def test_set_goal_past_date(client):
    """Cannot set a goal date in the past."""
    await _ensure_user(client)
    course = await _create_course(client)
    past_date = (date.today() - timedelta(days=1)).isoformat()

    resp = await client.put(
        f"/api/v1/goals/courses/{course['id']}",
        json={"goal_date": past_date},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_remove_goal(client):
    """Can remove a goal by setting null."""
    await _ensure_user(client)
    course = await _create_course(client)
    goal_date = (date.today() + timedelta(days=30)).isoformat()

    # Set goal
    await client.put(
        f"/api/v1/goals/courses/{course['id']}",
        json={"goal_date": goal_date},
    )

    # Remove goal
    resp = await client.put(
        f"/api/v1/goals/courses/{course['id']}",
        json={"goal_date": None},
    )
    assert resp.status_code == 200
    assert resp.json()["goal_date"] is None
    assert resp.json()["pace_status"] is None


@pytest.mark.asyncio
async def test_list_goals_empty(client):
    """List goals returns empty when no goals set."""
    await _ensure_user(client)
    resp = await client.get("/api/v1/goals")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_list_goals_with_data(client):
    """List goals returns courses with goal dates."""
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    await _create_lesson(client, section["id"])
    goal_date = (date.today() + timedelta(days=30)).isoformat()

    await client.put(
        f"/api/v1/goals/courses/{course['id']}",
        json={"goal_date": goal_date},
    )

    resp = await client.get("/api/v1/goals")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["course_id"] == course["id"]
    assert data[0]["pace_status"] is not None


@pytest.mark.asyncio
async def test_progress_includes_goal(client):
    """Progress endpoint includes goal data when goal is set."""
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    lesson = await _create_lesson(client, section["id"])
    goal_date = (date.today() + timedelta(days=30)).isoformat()

    # Set goal via course update
    await client.put(
        f"/api/v1/courses/{course['id']}",
        json={"goal_date": goal_date},
    )

    resp = await client.get(f"/api/v1/progress/courses/{course['id']}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["goal"] is not None
    assert data["goal"]["goal_date"] == goal_date
    assert data["goal"]["pace_status"] in ("on_track", "ahead", "behind")


@pytest.mark.asyncio
async def test_progress_no_goal(client):
    """Progress endpoint returns null goal when no goal set."""
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    await _create_lesson(client, section["id"])

    resp = await client.get(f"/api/v1/progress/courses/{course['id']}")
    assert resp.status_code == 200
    assert resp.json()["goal"] is None


@pytest.mark.asyncio
async def test_goal_not_found(client):
    """Setting goal on non-existent course returns 404."""
    await _ensure_user(client)
    import uuid

    resp = await client.put(
        f"/api/v1/goals/courses/{uuid.uuid4()}",
        json={"goal_date": (date.today() + timedelta(days=30)).isoformat()},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_goal_with_progress(client):
    """Goal pace reflects actual progress."""
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    lessons = []
    for _ in range(4):
        lesson = await _create_lesson(client, section["id"])
        lessons.append(lesson)

    # Complete 2 of 4 lessons
    await _complete_lesson(client, lessons[0]["id"])
    await _complete_lesson(client, lessons[1]["id"])

    goal_date = (date.today() + timedelta(days=60)).isoformat()
    resp = await client.put(
        f"/api/v1/goals/courses/{course['id']}",
        json={"goal_date": goal_date},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["completed_lessons"] == 2
    assert data["total_lessons"] == 4
    assert data["percentage"] == 50.0


# ============================================================
# Additional edge-case tests
# ============================================================


@pytest.mark.asyncio
async def test_set_goal_in_the_past(client):
    """Setting a goal_date in the past should be rejected."""
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    await _create_lesson(client, section["id"])

    past = (date.today() - timedelta(days=1)).isoformat()
    resp = await client.put(
        f"/api/v1/goals/courses/{course['id']}",
        json={"goal_date": past},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_list_goals_empty(client):
    """No goals set returns empty list."""
    await _ensure_user(client)
    resp = await client.get("/api/v1/goals")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_remove_goal_via_null(client):
    """Can remove a goal by setting goal_date to null."""
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    await _create_lesson(client, section["id"])

    goal_date = (date.today() + timedelta(days=30)).isoformat()
    await client.put(
        f"/api/v1/goals/courses/{course['id']}",
        json={"goal_date": goal_date},
    )

    # Remove goal by setting goal_date to null
    resp = await client.put(
        f"/api/v1/goals/courses/{course['id']}",
        json={"goal_date": None},
    )
    assert resp.status_code == 200

    goals = await client.get("/api/v1/goals")
    assert all(g["course_id"] != course["id"] for g in goals.json())
