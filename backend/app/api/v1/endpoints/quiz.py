"""API endpoints for quiz question management (creator) and quiz attempts (learner)."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.course import Course
from app.models.enrollment import CourseEnrollment
from app.models.lesson import Lesson
from app.models.section import Section
from app.models.user import User
from app.repositories.quiz_repo import QuizRepository
from app.schemas.quiz import (
    QuizAttemptResponse,
    QuizBestScore,
    QuizQuestionCreate,
    QuizQuestionReorder,
    QuizQuestionResponse,
    QuizQuestionUpdate,
    QuizSubmitRequest,
)

router = APIRouter(prefix="/quiz", tags=["quiz"])

MAX_QUESTIONS_PER_QUIZ = 50
PASS_PERCENTAGE = 60.0


# ── Helpers ───────────────────────────────────────────────────

async def _verify_lesson_owner(
    db: AsyncSession, lesson_id: uuid.UUID, user_id: uuid.UUID
) -> Lesson:
    """Confirm lesson exists, is quiz type, and belongs to the user's course."""
    result = await db.execute(
        select(Lesson)
        .join(Section, Section.id == Lesson.section_id)
        .join(Course, Course.id == Section.course_id)
        .where(
            Lesson.id == lesson_id,
            Course.user_id == user_id,
            Course.is_deleted == False,  # noqa: E712
        )
    )
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found.")
    if lesson.lesson_type != "quiz":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Lesson is not a quiz.")
    return lesson


async def _verify_learner_access(
    db: AsyncSession, lesson_id: uuid.UUID, user_id: uuid.UUID
) -> Lesson:
    """Confirm learner is enrolled in the course containing this quiz lesson."""
    result = await db.execute(
        select(Lesson)
        .join(Section, Section.id == Lesson.section_id)
        .join(Course, Course.id == Section.course_id)
        .where(
            Lesson.id == lesson_id,
            Course.is_deleted == False,  # noqa: E712
        )
    )
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found.")
    if lesson.lesson_type != "quiz":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Lesson is not a quiz.")

    # Check enrollment or ownership
    enroll = await db.execute(
        select(CourseEnrollment.id)
        .join(Section, Section.course_id == CourseEnrollment.course_id)
        .where(
            Section.id == lesson.section_id,
            CourseEnrollment.user_id == user_id,
        )
    )
    own = await db.execute(
        select(Course.id)
        .join(Section, Section.course_id == Course.id)
        .where(Section.id == lesson.section_id, Course.user_id == user_id)
    )
    if not enroll.first() and not own.first():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enrolled.")
    return lesson


# ── Creator: Question CRUD ────────────────────────────────────

@router.post(
    "/lessons/{lesson_id}/questions",
    response_model=QuizQuestionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_question(
    lesson_id: uuid.UUID,
    data: QuizQuestionCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _verify_lesson_owner(db, lesson_id, user.id)
    repo = QuizRepository(db)
    count = await repo.count_questions(lesson_id)
    if count >= MAX_QUESTIONS_PER_QUIZ:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum of {MAX_QUESTIONS_PER_QUIZ} questions per quiz.",
        )
    question = await repo.create_question(
        lesson_id=lesson_id,
        question=data.question,
        options=data.options,
        correct_option=data.correct_option,
    )
    await db.commit()
    return QuizQuestionResponse.model_validate(question)


@router.get(
    "/lessons/{lesson_id}/questions",
    response_model=list[QuizQuestionResponse],
)
async def list_questions(
    lesson_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = QuizRepository(db)
    return [
        QuizQuestionResponse.model_validate(q)
        for q in await repo.list_questions(lesson_id)
    ]


@router.put(
    "/questions/{question_id}",
    response_model=QuizQuestionResponse,
)
async def update_question(
    question_id: uuid.UUID,
    data: QuizQuestionUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = QuizRepository(db)
    question = await repo.get_question(question_id)
    if not question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found.")
    await _verify_lesson_owner(db, question.lesson_id, user.id)
    fields = data.model_dump(exclude_unset=True)
    if fields:
        await repo.update_question(question, **fields)
    await db.commit()
    return QuizQuestionResponse.model_validate(question)


@router.delete(
    "/questions/{question_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_question(
    question_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = QuizRepository(db)
    question = await repo.get_question(question_id)
    if not question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found.")
    await _verify_lesson_owner(db, question.lesson_id, user.id)
    await repo.delete_question(question)
    await db.commit()


@router.put(
    "/lessons/{lesson_id}/questions/reorder",
    response_model=list[QuizQuestionResponse],
)
async def reorder_questions(
    lesson_id: uuid.UUID,
    data: QuizQuestionReorder,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _verify_lesson_owner(db, lesson_id, user.id)
    repo = QuizRepository(db)
    questions = await repo.reorder_questions(lesson_id, data.items)
    await db.commit()
    return [QuizQuestionResponse.model_validate(q) for q in questions]


# ── Learner: Quiz Taking ──────────────────────────────────────

@router.post(
    "/lessons/{lesson_id}/submit",
    response_model=QuizAttemptResponse,
)
async def submit_quiz(
    lesson_id: uuid.UUID,
    data: QuizSubmitRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit quiz answers and get graded results."""
    await _verify_learner_access(db, lesson_id, user.id)
    repo = QuizRepository(db)
    questions = await repo.list_questions(lesson_id)
    if not questions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This quiz has no questions.",
        )

    # Grade the quiz
    total = len(questions)
    score = 0
    results = []
    for q in questions:
        selected = data.answers.get(str(q.id))
        is_correct = selected == q.correct_option
        if is_correct:
            score += 1
        results.append({
            "question_id": str(q.id),
            "question": q.question,
            "options": q.options,
            "correct_option": q.correct_option,
            "selected_option": selected,
            "is_correct": is_correct,
        })

    percentage = round((score / total) * 100, 1) if total > 0 else 0
    passed = percentage >= PASS_PERCENTAGE

    attempt = await repo.create_attempt(
        user_id=user.id,
        lesson_id=lesson_id,
        answers=data.answers,
        score=score,
        total=total,
        percentage=percentage,
        passed=passed,
    )
    await db.commit()

    response = QuizAttemptResponse.model_validate(attempt)
    response.results = results
    return response


@router.get(
    "/lessons/{lesson_id}/attempts",
    response_model=list[QuizAttemptResponse],
)
async def list_attempts(
    lesson_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = QuizRepository(db)
    attempts = await repo.get_attempts(user.id, lesson_id)
    return [QuizAttemptResponse.model_validate(a) for a in attempts]


@router.get(
    "/lessons/{lesson_id}/best",
    response_model=QuizBestScore | None,
)
async def get_best_score(
    lesson_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = QuizRepository(db)
    best = await repo.get_best_attempt(user.id, lesson_id)
    if not best:
        return None
    count = await repo.count_attempts(user.id, lesson_id)
    return QuizBestScore(
        lesson_id=lesson_id,
        best_score=best.score,
        total=best.total,
        best_percentage=best.percentage,
        attempts_count=count,
        passed=best.passed,
    )


@router.get(
    "/lessons/{lesson_id}/questions/learner",
    response_model=list[dict],
)
async def get_questions_for_learner(
    lesson_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get questions without correct answers — for learner quiz-taking UI."""
    await _verify_learner_access(db, lesson_id, user.id)
    repo = QuizRepository(db)
    questions = await repo.list_questions(lesson_id)
    return [
        {
            "id": str(q.id),
            "question": q.question,
            "options": q.options,
            "position": q.position,
        }
        for q in questions
    ]
