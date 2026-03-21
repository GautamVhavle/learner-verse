"""Pydantic schemas for Course CRUD, listing, validation, and status updates."""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field


# --- Tag schemas ---
class TagResponse(BaseModel):
    id: uuid.UUID
    name: str

    model_config = {"from_attributes": True}


# --- Course schemas ---
class CourseCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    thumbnail_url: str | None = None
    goal_date: date | None = None
    tags: list[str] = Field(default_factory=list, max_length=20)


class CourseUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    thumbnail_url: str | None = None
    status: str | None = Field(None, pattern=r"^(draft|ready)$")
    goal_date: date | None = None
    tags: list[str] | None = Field(None, max_length=20)


class CourseResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    description: str | None = None
    thumbnail_url: str | None = None
    status: str
    is_deleted: bool
    deleted_at: datetime | None = None
    goal_date: date | None = None
    tags: list[TagResponse] = []
    section_count: int = 0
    lesson_count: int = 0
    has_issues: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CourseListResponse(BaseModel):
    items: list[CourseResponse]
    total: int


class ValidationError(BaseModel):
    section: str
    lesson: str | None = None
    message: str


class StatusUpdateRequest(BaseModel):
    status: str = Field(..., pattern=r"^(draft|ready)$")


class StatusUpdateResponse(BaseModel):
    status: str
    valid: bool
    errors: list[ValidationError] = []
