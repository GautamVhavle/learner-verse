"""Pydantic schemas for Lesson CRUD, movement, and reference links."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class LessonCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    lesson_type: str = Field("video", pattern=r"^(video|note|quiz)$")


class LessonUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    lesson_type: str | None = Field(None, pattern=r"^(video|note|quiz)$")
    youtube_url: str | None = None
    youtube_title: str | None = None
    youtube_thumbnail: str | None = None
    youtube_duration: str | None = None
    youtube_channel: str | None = None
    notes_markdown: str | None = Field(None, max_length=50000)


class LessonMove(BaseModel):
    target_section_id: uuid.UUID
    position: int = Field(..., ge=0)


# ── Reference Links ─────────────────────────────────────────
class ReferenceLinkCreate(BaseModel):
    url: str = Field(..., min_length=1, max_length=2000)
    title: str | None = Field(None, max_length=500)
    description: str | None = Field(None, max_length=2000)
    image: str | None = None
    favicon: str | None = None
    domain: str | None = Field(None, max_length=255)


class ReferenceLinkResponse(BaseModel):
    id: uuid.UUID
    lesson_id: uuid.UUID
    url: str
    title: str | None = None
    description: str | None = None
    image: str | None = None
    favicon: str | None = None
    domain: str | None = None
    position: int
    created_at: datetime

    model_config = {"from_attributes": True}


class QuizQuestionResponse(BaseModel):
    id: uuid.UUID
    lesson_id: uuid.UUID
    question: str
    options: list[str]
    correct_option: int
    position: int
    created_at: datetime

    model_config = {"from_attributes": True}


class LessonResponse(BaseModel):
    id: uuid.UUID
    section_id: uuid.UUID
    title: str
    lesson_type: str = "video"
    youtube_url: str | None = None
    youtube_title: str | None = None
    youtube_thumbnail: str | None = None
    youtube_duration: str | None = None
    youtube_channel: str | None = None
    notes_markdown: str | None = None
    reference_links: list[ReferenceLinkResponse] = []
    quiz_questions: list[QuizQuestionResponse] = []
    position: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
