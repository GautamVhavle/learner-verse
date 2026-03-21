"""Pydantic schemas for user profile responses and updates."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class UserResponse(BaseModel):
    id: uuid.UUID
    clerk_id: str | None = None
    email: str
    display_name: str
    avatar_url: str | None = None
    timezone: str = "UTC"
    playback_speed: float = 1.0
    font_size: str = "normal"
    onboarding_complete: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    display_name: str | None = Field(None, max_length=255)
    avatar_url: str | None = None
    timezone: str | None = Field(None, max_length=100)
    playback_speed: float | None = Field(None, ge=0.25, le=4.0)
    font_size: str | None = Field(None, pattern=r"^(normal|large|xl)$")
    onboarding_complete: bool | None = None
