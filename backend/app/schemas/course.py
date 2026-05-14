"""Pydantic schemas for Course CRUD, listing, validation, and status updates."""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field, field_validator

from app.core.categories import CATEGORY_SLUGS


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
    category: str = "other"
    tags: list[str] = Field(default_factory=list, max_length=20)

    @field_validator("thumbnail_url")
    @classmethod
    def validate_thumbnail_url(cls, v: str | None) -> str | None:
        import re

        if v is not None and not re.match(r"^https?://", v, re.IGNORECASE):
            raise ValueError("URL must start with http:// or https://")
        return v

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        if v not in CATEGORY_SLUGS:
            raise ValueError(
                f"Invalid category. Must be one of: {', '.join(sorted(CATEGORY_SLUGS))}"
            )
        return v


class CourseUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    thumbnail_url: str | None = None
    status: str | None = Field(None, pattern=r"^(draft|ready)$")
    is_public: bool | None = None
    category: str | None = None
    goal_date: date | None = None
    tags: list[str] | None = Field(None, max_length=20)

    @field_validator("thumbnail_url")
    @classmethod
    def validate_thumbnail_url(cls, v: str | None) -> str | None:
        import re

        if v is not None and not re.match(r"^https?://", v, re.IGNORECASE):
            raise ValueError("URL must start with http:// or https://")
        return v

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str | None) -> str | None:
        if v is not None and v not in CATEGORY_SLUGS:
            raise ValueError(
                f"Invalid category. Must be one of: {', '.join(sorted(CATEGORY_SLUGS))}"
            )
        return v


class CourseResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    description: str | None = None
    thumbnail_url: str | None = None
    status: str
    is_public: bool = False
    is_deleted: bool
    deleted_at: datetime | None = None
    category: str = "other"
    goal_date: date | None = None
    tags: list[TagResponse] = []
    section_count: int = 0
    lesson_count: int = 0
    has_issues: bool = False
    enrollment_count: int = 0
    average_rating: float = 0.0
    rating_count: int = 0
    creator_name: str = ""
    is_creator_verified: bool = False
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
