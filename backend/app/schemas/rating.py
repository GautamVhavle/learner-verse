"""Pydantic schemas for course ratings."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class RatingCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    review: str | None = Field(None, max_length=2000)


class RatingUpdate(BaseModel):
    rating: int | None = Field(None, ge=1, le=5)
    review: str | None = Field(None, max_length=2000)


class RatingResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    course_id: uuid.UUID
    rating: int
    review: str | None = None
    user_name: str = ""
    user_avatar: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RatingListResponse(BaseModel):
    items: list[RatingResponse]
    total: int
    average: float = 0.0
