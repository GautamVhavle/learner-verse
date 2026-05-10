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
    bio: str | None = None
    profile_tags: list[str] = []
    social_links: list[dict] = []
    cover_image_url: str | None = None
    is_profile_public: bool = False
    auto_play_next: bool = True
    is_pro: bool = False
    pro_since: datetime | None = None
    pro_expires_at: datetime | None = None
    pro_plan: str | None = None
    is_verified_creator: bool = False
    verified_at: datetime | None = None
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
    bio: str | None = Field(None, max_length=500)
    profile_tags: list[str] | None = Field(None, max_length=10)
    social_links: list[dict] | None = Field(None, max_length=10)
    cover_image_url: str | None = None
    is_profile_public: bool | None = None
    auto_play_next: bool | None = None


class PublicProfileResponse(BaseModel):
    """Public-facing profile — no email, no private settings."""

    id: uuid.UUID
    display_name: str
    avatar_url: str | None = None
    bio: str | None = None
    profile_tags: list[str] = []
    social_links: list[dict] = []
    cover_image_url: str | None = None
    member_since: datetime

    # Stats
    total_courses_completed: int = 0
    total_lessons_completed: int = 0
    current_streak: int = 0
    longest_streak: int = 0
    total_active_days: int = 0

    # Verified creator badge
    is_verified_creator: bool = False

    # Pro subscription badge
    is_pro: bool = False

    # Certificates
    certificates: list["PublicCertificateItem"] = []

    # Activity heatmap
    activity_heatmap: list["ActivityDayItem"] = []

    model_config = {"from_attributes": True}


class PublicCertificateItem(BaseModel):
    certificate_uid: str
    course_title: str
    completed_at: datetime


class ActivityDayItem(BaseModel):
    date: str
    count: int
