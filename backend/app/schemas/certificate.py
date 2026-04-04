"""Pydantic schemas for course-completion certificates."""

import uuid
from datetime import datetime

from pydantic import BaseModel


class CertificateResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    course_id: uuid.UUID
    certificate_uid: str
    user_name: str
    course_title: str
    sections_count: int
    lessons_count: int
    completed_at: datetime

    model_config = {"from_attributes": True}


# ── Detailed share view (public) ────────────────────


class LessonBrief(BaseModel):
    """Minimal lesson info for the public certificate detail page."""

    title: str
    lesson_type: str


class SectionBrief(BaseModel):
    """Minimal section info with its lessons for the public certificate detail page."""

    title: str
    lessons: list[LessonBrief]


class CertificateDetailResponse(CertificateResponse):
    """Extended certificate response that includes course structure metadata."""

    course_description: str | None = None
    sections: list[SectionBrief] = []
