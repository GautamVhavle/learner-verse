"""Tests for quiz endpoints.

Covers question CRUD, reordering, quiz submission, attempts, and best score.
"""

import pytest


# --- Helpers ---
async def _ensure_user(client):
    await client.get("/api/v1/auth/me")


async def _create_course(client, **overrides):
    payload = {"title": "Quiz Course", **overrides}
    resp = await client.post("/api/v1/courses", json=payload)
    assert resp.status_code == 201
    return resp.json()


async def _create_section(client, course_id, **overrides):
    payload = {"title": "Quiz Section", **overrides}
    resp = await client.post(f"/api/v1/courses/{course_id}/sections", json=payload)
    assert resp.status_code == 201
    return resp.json()


async def _create_quiz_lesson(client, section_id, **overrides):
    """Create a lesson and set its type to 'quiz'."""
    payload = {"title": "Quiz Lesson", **overrides}
    resp = await client.post(f"/api/v1/sections/{section_id}/lessons", json=payload)
    assert resp.status_code == 201
    lesson = resp.json()

    # Update lesson_type to quiz
    update = await client.put(
        f"/api/v1/sections/{section_id}/lessons/{lesson['id']}",
        json={"lesson_type": "quiz"},
    )
    assert update.status_code == 200
    return update.json()


def _question_payload(**overrides):
    return {
        "question": "What is 2 + 2?",
        "options": ["3", "4", "5", "6"],
        "correct_option": 1,
        **overrides,
    }


async def _add_question(client, lesson_id, **overrides):
    resp = await client.post(
        f"/api/v1/quiz/lessons/{lesson_id}/questions",
        json=_question_payload(**overrides),
    )
    assert resp.status_code == 201
    return resp.json()


async def _setup_quiz(client, num_questions=1):
    """Create a course → section → quiz lesson with questions. Returns dict."""
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    lesson = await _create_quiz_lesson(client, section["id"])
    questions = []
    for i in range(num_questions):
        q = await _add_question(
            client,
            lesson["id"],
            question=f"Question {i}?",
            correct_option=i % 4,
        )
        questions.append(q)
    return {
        "course": course,
        "section": section,
        "lesson": lesson,
        "questions": questions,
    }


# ============================================================
# CREATE question
# ============================================================
@pytest.mark.asyncio
async def test_create_question(client):
    """Can create a quiz question on a quiz lesson."""
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    lesson = await _create_quiz_lesson(client, section["id"])

    q = await _add_question(client, lesson["id"])
    assert q["question"] == "What is 2 + 2?"
    assert len(q["options"]) == 4
    assert q["correct_option"] == 1


@pytest.mark.asyncio
async def test_create_question_on_non_quiz_lesson(client):
    """Adding a question to a non-quiz lesson should fail."""
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    resp = await client.post(
        f"/api/v1/sections/{section['id']}/lessons",
        json={"title": "Regular Lesson"},
    )
    lesson = resp.json()

    resp = await client.post(
        f"/api/v1/quiz/lessons/{lesson['id']}/questions",
        json=_question_payload(),
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_create_question_invalid_correct_option(client):
    """correct_option outside 0-3 should be rejected."""
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    lesson = await _create_quiz_lesson(client, section["id"])

    resp = await client.post(
        f"/api/v1/quiz/lessons/{lesson['id']}/questions",
        json=_question_payload(correct_option=5),
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_question_wrong_option_count(client):
    """Must have exactly 4 options."""
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    lesson = await _create_quiz_lesson(client, section["id"])

    resp = await client.post(
        f"/api/v1/quiz/lessons/{lesson['id']}/questions",
        json=_question_payload(options=["A", "B"]),
    )
    assert resp.status_code == 422


# ============================================================
# LIST questions
# ============================================================
@pytest.mark.asyncio
async def test_list_questions(client):
    """List returns all questions for a quiz."""
    setup = await _setup_quiz(client, num_questions=3)
    lesson_id = setup["lesson"]["id"]

    resp = await client.get(f"/api/v1/quiz/lessons/{lesson_id}/questions")
    assert resp.status_code == 200
    assert len(resp.json()) == 3


@pytest.mark.asyncio
async def test_list_questions_empty(client):
    """Quiz with no questions returns empty list."""
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    lesson = await _create_quiz_lesson(client, section["id"])

    resp = await client.get(f"/api/v1/quiz/lessons/{lesson['id']}/questions")
    assert resp.status_code == 200
    assert resp.json() == []


# ============================================================
# UPDATE question
# ============================================================
@pytest.mark.asyncio
async def test_update_question_text(client):
    """Can update the question text."""
    setup = await _setup_quiz(client)
    q_id = setup["questions"][0]["id"]

    resp = await client.put(
        f"/api/v1/quiz/questions/{q_id}",
        json={"question": "Updated question?"},
    )
    assert resp.status_code == 200
    assert resp.json()["question"] == "Updated question?"


@pytest.mark.asyncio
async def test_update_nonexistent_question(client):
    """Updating a non-existent question returns 404."""
    await _ensure_user(client)
    resp = await client.put(
        "/api/v1/quiz/questions/00000000-0000-0000-0000-000000000099",
        json={"question": "Nope"},
    )
    assert resp.status_code == 404


# ============================================================
# DELETE question
# ============================================================
@pytest.mark.asyncio
async def test_delete_question(client):
    """Can delete a question."""
    setup = await _setup_quiz(client, num_questions=2)
    q_id = setup["questions"][0]["id"]
    lesson_id = setup["lesson"]["id"]

    resp = await client.delete(f"/api/v1/quiz/questions/{q_id}")
    assert resp.status_code == 204

    remaining = await client.get(f"/api/v1/quiz/lessons/{lesson_id}/questions")
    assert len(remaining.json()) == 1


@pytest.mark.asyncio
async def test_delete_nonexistent_question(client):
    """Deleting a non-existent question returns 404."""
    await _ensure_user(client)
    resp = await client.delete("/api/v1/quiz/questions/00000000-0000-0000-0000-000000000099")
    assert resp.status_code == 404


# ============================================================
# REORDER questions
# ============================================================
@pytest.mark.asyncio
async def test_reorder_questions(client):
    """Can reorder questions by position."""
    setup = await _setup_quiz(client, num_questions=3)
    lesson_id = setup["lesson"]["id"]
    qs = setup["questions"]

    # Reverse the order
    new_order = [
        {"id": qs[2]["id"], "position": 0},
        {"id": qs[1]["id"], "position": 1},
        {"id": qs[0]["id"], "position": 2},
    ]
    resp = await client.put(
        f"/api/v1/quiz/lessons/{lesson_id}/questions/reorder",
        json={"items": new_order},
    )
    assert resp.status_code == 200
    result = resp.json()
    assert result[0]["id"] == qs[2]["id"]


# ============================================================
# SUBMIT quiz answers
# ============================================================
@pytest.mark.asyncio
async def test_submit_quiz_all_correct(client):
    """Submitting all correct answers yields 100% and passed=True."""
    setup = await _setup_quiz(client, num_questions=3)
    lesson_id = setup["lesson"]["id"]
    qs = setup["questions"]

    answers = {q["id"]: q["correct_option"] for q in qs}
    resp = await client.post(
        f"/api/v1/quiz/lessons/{lesson_id}/submit",
        json={"answers": answers},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["score"] == 3
    assert data["total"] == 3
    assert data["percentage"] == 100.0
    assert data["passed"] is True


@pytest.mark.asyncio
async def test_submit_quiz_all_wrong(client):
    """Submitting all wrong answers yields 0% and passed=False."""
    setup = await _setup_quiz(client, num_questions=3)
    lesson_id = setup["lesson"]["id"]
    qs = setup["questions"]

    # Pick wrong answer for each
    answers = {q["id"]: (q["correct_option"] + 1) % 4 for q in qs}
    resp = await client.post(
        f"/api/v1/quiz/lessons/{lesson_id}/submit",
        json={"answers": answers},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["score"] == 0
    assert data["passed"] is False


@pytest.mark.asyncio
async def test_submit_quiz_no_questions(client):
    """Submitting on a quiz with no questions returns error."""
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    lesson = await _create_quiz_lesson(client, section["id"])

    resp = await client.post(
        f"/api/v1/quiz/lessons/{lesson['id']}/submit",
        json={"answers": {}},
    )
    assert resp.status_code == 400


# ============================================================
# GET attempts & best score
# ============================================================
@pytest.mark.asyncio
async def test_list_attempts(client):
    """Multiple submissions create multiple attempt records."""
    setup = await _setup_quiz(client, num_questions=2)
    lesson_id = setup["lesson"]["id"]
    qs = setup["questions"]

    answers = {q["id"]: q["correct_option"] for q in qs}
    await client.post(
        f"/api/v1/quiz/lessons/{lesson_id}/submit",
        json={"answers": answers},
    )
    await client.post(
        f"/api/v1/quiz/lessons/{lesson_id}/submit",
        json={"answers": answers},
    )

    resp = await client.get(f"/api/v1/quiz/lessons/{lesson_id}/attempts")
    assert resp.status_code == 200
    assert len(resp.json()) == 2


@pytest.mark.asyncio
async def test_best_score(client):
    """Best score returns the highest scoring attempt."""
    setup = await _setup_quiz(client, num_questions=2)
    lesson_id = setup["lesson"]["id"]
    qs = setup["questions"]

    # Submit wrong answers first
    wrong = {q["id"]: (q["correct_option"] + 1) % 4 for q in qs}
    await client.post(
        f"/api/v1/quiz/lessons/{lesson_id}/submit",
        json={"answers": wrong},
    )
    # Then correct
    correct = {q["id"]: q["correct_option"] for q in qs}
    await client.post(
        f"/api/v1/quiz/lessons/{lesson_id}/submit",
        json={"answers": correct},
    )

    resp = await client.get(f"/api/v1/quiz/lessons/{lesson_id}/best")
    assert resp.status_code == 200
    data = resp.json()
    assert data["best_percentage"] == 100.0
    assert data["attempts_count"] == 2


@pytest.mark.asyncio
async def test_best_score_no_attempts(client):
    """Best score with no attempts returns null."""
    await _ensure_user(client)
    course = await _create_course(client)
    section = await _create_section(client, course["id"])
    lesson = await _create_quiz_lesson(client, section["id"])

    resp = await client.get(f"/api/v1/quiz/lessons/{lesson['id']}/best")
    assert resp.status_code == 200
    assert resp.json() is None


# ============================================================
# Learner questions (no correct answers)
# ============================================================
@pytest.mark.asyncio
async def test_learner_questions_hide_correct_answer(client):
    """Learner endpoint does not expose correct_option."""
    setup = await _setup_quiz(client, num_questions=2)
    lesson_id = setup["lesson"]["id"]

    resp = await client.get(f"/api/v1/quiz/lessons/{lesson_id}/questions/learner")
    assert resp.status_code == 200
    questions = resp.json()
    assert len(questions) == 2
    for q in questions:
        assert "correct_option" not in q
