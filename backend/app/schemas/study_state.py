"""Pydantic schemas for course study state (last-accessed lesson)."""

import uuid
from datetime import datetime

from pydantic import BaseModel


class StudyStateResponse(BaseModel):
    course_id: uuid.UUID
    last_lesson_id: uuid.UUID | None = None
    last_accessed_at: datetime

    model_config = {"from_attributes": True}


class StudyStateUpdate(BaseModel):
    last_lesson_id: uuid.UUID
