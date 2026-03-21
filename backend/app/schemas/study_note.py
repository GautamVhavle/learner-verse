"""Pydantic schemas for per-lesson study notes."""

from datetime import datetime

from pydantic import BaseModel


class StudyNoteResponse(BaseModel):
    content: str | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class StudyNoteUpdate(BaseModel):
    content: str | None = None
