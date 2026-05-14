"""Pydantic schemas for Section CRUD, reordering, and brief responses."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class SectionCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = None


class SectionUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None


class SectionResponse(BaseModel):
    id: uuid.UUID
    course_id: uuid.UUID
    title: str
    description: str | None = None
    position: int
    lessons: list["LessonResponse"] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SectionPublicResponse(BaseModel):
    """Learner-facing section without quiz answers in lessons."""

    id: uuid.UUID
    course_id: uuid.UUID
    title: str
    description: str | None = None
    position: int
    lessons: list["LessonPublicResponse"] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SectionBriefResponse(BaseModel):
    """Section without nested lessons - for reorder responses."""

    id: uuid.UUID
    course_id: uuid.UUID
    title: str
    position: int

    model_config = {"from_attributes": True}


class ReorderItem(BaseModel):
    id: uuid.UUID
    position: int = Field(..., ge=0)


class ReorderRequest(BaseModel):
    items: list[ReorderItem] = Field(..., min_length=1)


# Avoid circular import - LessonResponse defined in lesson schema
from app.schemas.lesson import LessonPublicResponse, LessonResponse  # noqa: E402

SectionResponse.model_rebuild()
SectionPublicResponse.model_rebuild()
