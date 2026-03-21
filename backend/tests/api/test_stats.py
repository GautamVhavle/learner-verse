import pytest
from datetime import date, timedelta

from app.services.stats_service import StatsService


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
# Unit tests: Streak computation
# ============================================================


def test_streak_no_activity():
    """No activity → 0 streaks."""
    current, longest = StatsService._compute_streaks([], date(2026, 3, 20))
    assert current == 0
    assert longest == 0


def test_streak_single_day():
    """Single active day that is today → 1 day streak."""
    today = date(2026, 3, 20)
    current, longest = StatsService._compute_streaks([today], today)
    assert current == 1
    assert longest == 1


def test_streak_consecutive_days():
    """3 consecutive days → current=3, longest=3."""
    today = date(2026, 3, 20)
    dates = [date(2026, 3, 18), date(2026, 3, 19), date(2026, 3, 20)]
    current, longest = StatsService._compute_streaks(dates, today)
    assert current == 3
    assert longest == 3


def test_streak_grace_period():
    """Days within 7-day grace period still count as a streak."""
    today = date(2026, 3, 20)
    # Activity on Mar 10, Mar 17, Mar 20 — gaps of 7 and 3 days
    dates = [date(2026, 3, 10), date(2026, 3, 17), date(2026, 3, 20)]
    current, longest = StatsService._compute_streaks(dates, today)
    assert current == 3  # all within grace
    assert longest == 3


def test_streak_broken_by_long_gap():
    """Gap > 7 days breaks the streak."""
    today = date(2026, 3, 15)
    # Gap of 9 between Mar 1 and Mar 10 breaks, gap of 5 between Mar 10 and Mar 15 continues
    dates = [date(2026, 3, 1), date(2026, 3, 10), date(2026, 3, 15)]
    current, longest = StatsService._compute_streaks(dates, today)
    assert current == 2  # Mar 10 + Mar 15
    assert longest == 2


def test_streak_expired():
    """Last active > 7 days ago → current streak is 0."""
    today = date(2026, 3, 20)
    dates = [date(2026, 3, 1), date(2026, 3, 2), date(2026, 3, 3)]
    current, longest = StatsService._compute_streaks(dates, today)
    assert current == 0  # too long ago
    assert longest == 3


def test_streak_longest_vs_current():
    """Longest streak from history may differ from current."""
    today = date(2026, 3, 20)
    # Long streak in February, then gap, then short streak now
    dates = [
        date(2026, 2, 1),
        date(2026, 2, 2),
        date(2026, 2, 3),
        date(2026, 2, 4),
        date(2026, 2, 5),
        # gap > 7
        date(2026, 3, 19),
        date(2026, 3, 20),
    ]
    current, longest = StatsService._compute_streaks(dates, today)
    assert current == 2
    assert longest == 5


# ============================================================
# API tests: Stats endpoints
# ============================================================


@pytest.mark.asyncio
async def test_stats_overview_empty(client):
    """Overview returns zeros when no activity."""
    await _ensure_user(client)
    resp = await client.get("/api/v1/stats/overview")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_courses_completed"] == 0
    assert data["total_lessons_completed"] == 0
    assert data["current_streak"] == 0
    assert data["longest_streak"] == 0


@pytest.mark.asyncio
async def test_stats_overview_with_data(client):
    """Overview reflects completed lessons."""
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    lesson1 = await _create_lesson(client, section["id"])
    lesson2 = await _create_lesson(client, section["id"])

    await _complete_lesson(client, lesson1["id"])
    await _complete_lesson(client, lesson2["id"])

    resp = await client.get("/api/v1/stats/overview")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_lessons_completed"] == 2
    assert data["current_streak"] >= 1
    assert data["total_active_days"] >= 1


@pytest.mark.asyncio
async def test_streak_endpoint(client):
    """Streak endpoint returns current and longest streak."""
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    lesson = await _create_lesson(client, section["id"])
    await _complete_lesson(client, lesson["id"])

    resp = await client.get("/api/v1/stats/streak")
    assert resp.status_code == 200
    data = resp.json()
    assert data["current_streak"] >= 1
    assert data["longest_streak"] >= 1
    assert data["last_active_date"] is not None


@pytest.mark.asyncio
async def test_activity_endpoint(client):
    """Activity endpoint returns heatmap data."""
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    lesson = await _create_lesson(client, section["id"])
    await _complete_lesson(client, lesson["id"])

    resp = await client.get("/api/v1/stats/activity")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_lessons"] >= 1
    assert len(data["days"]) >= 1
    assert data["days"][0]["count"] >= 1


@pytest.mark.asyncio
async def test_activity_logged_on_completion(client):
    """Completing a lesson creates an activity log entry."""
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    lesson1 = await _create_lesson(client, section["id"])
    lesson2 = await _create_lesson(client, section["id"])

    # Complete two lessons on the same day
    await _complete_lesson(client, lesson1["id"])
    await _complete_lesson(client, lesson2["id"])

    resp = await client.get("/api/v1/stats/activity")
    data = resp.json()
    assert data["total_lessons"] == 2
    # Should be a single day with count=2
    today_str = date.today().isoformat()
    today_entry = next((d for d in data["days"] if d["date"] == today_str), None)
    assert today_entry is not None
    assert today_entry["count"] == 2


@pytest.mark.asyncio
async def test_uncomplete_does_not_log(client):
    """Un-completing a lesson doesn't add to activity."""
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    lesson = await _create_lesson(client, section["id"])

    # Complete then uncomplete
    await _complete_lesson(client, lesson["id"])
    resp = await client.put(
        f"/api/v1/progress/lessons/{lesson['id']}",
        json={"completed": False},
    )
    assert resp.status_code == 200

    activity = await client.get("/api/v1/stats/activity")
    data = activity.json()
    # Should still have 1 from the initial completion
    assert data["total_lessons"] == 1


@pytest.mark.asyncio
async def test_activity_months_param(client):
    """Activity endpoint respects months parameter."""
    await _ensure_user(client)
    resp = await client.get("/api/v1/stats/activity?months=6")
    assert resp.status_code == 200
    assert "days" in resp.json()
