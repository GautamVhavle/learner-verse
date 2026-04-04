"""Pydantic schemas for quiz question management and quiz attempts."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


# ── Quiz Questions (Creator) ─────────────────────────────────

class QuizQuestionCreate(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
    options: list[str] = Field(..., min_length=4, max_length=4)
    correct_option: int = Field(..., ge=0, le=3)


class QuizQuestionUpdate(BaseModel):
    question: str | None = Field(None, min_length=1, max_length=2000)
    options: list[str] | None = Field(None, min_length=4, max_length=4)
    correct_option: int | None = Field(None, ge=0, le=3)


class QuizQuestionReorder(BaseModel):
    items: list[dict] = Field(
        ..., description="List of {id, position} objects"
    )


class AIQuizGenerateRequest(BaseModel):
    """Request payload for AI-powered quiz generation."""
    topic: str = Field(..., min_length=1, max_length=500)
    difficulty: str = Field(
        ..., pattern="^(easy|medium|hard)$",
        description="Difficulty level: easy, medium, or hard",
    )
    num_questions: int = Field(..., ge=1, le=25)


class QuizQuestionResponse(BaseModel):
    id: uuid.UUID
    lesson_id: uuid.UUID
    question: str
    options: list[str]
    correct_option: int
    position: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Quiz Attempts (Learner) ──────────────────────────────────

class QuizSubmitRequest(BaseModel):
    """Learner submits answers: map of question_id -> selected option index."""
    answers: dict[str, int] = Field(
        ..., description="Map of question_id (str UUID) to selected option index (0-3)"
    )


class QuizAttemptResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    lesson_id: uuid.UUID
    score: int
    total: int
    percentage: float
    passed: bool
    answers: dict
    results: list[dict] | None = None
    completed_at: datetime

    model_config = {"from_attributes": True}


class QuizBestScore(BaseModel):
    """Summary of the best attempt for a quiz lesson."""
    lesson_id: uuid.UUID
    best_score: int
    total: int
    best_percentage: float
    attempts_count: int
    passed: bool
