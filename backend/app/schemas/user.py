"""Pydantic schemas for user profile responses and updates."""

import re
import uuid
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field, field_validator


# ── Reusable helpers ─────────────────────────────────────────

_HTTP_URL_RE = re.compile(r"^https?://", re.IGNORECASE)


def _validate_http_url(v: str | None) -> str | None:
    """Reject non-HTTP(S) URLs to prevent javascript:/data: injection."""
    if v is not None and not _HTTP_URL_RE.match(v):
        raise ValueError("URL must start with http:// or https://")
    return v


# ── Constrained tag type ─────────────────────────────────────

ProfileTag = Annotated[str, Field(min_length=1, max_length=50)]


# ── Social link model ────────────────────────────────────────


class SocialLink(BaseModel):
    """A validated social-media link with constrained fields."""

    platform: str = Field(..., min_length=1, max_length=30)
    url: str = Field(..., min_length=1, max_length=500)

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        if not _HTTP_URL_RE.match(v):
            raise ValueError("URL must start with http:// or https://")
        return v


# ── Responses ────────────────────────────────────────────────


class UserResponse(BaseModel):
    id: uuid.UUID
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
    subscription_status: str | None = None
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
    profile_tags: list[ProfileTag] | None = Field(None, max_length=10)
    social_links: list[SocialLink] | None = Field(None, max_length=10)
    cover_image_url: str | None = None
    is_profile_public: bool | None = None
    auto_play_next: bool | None = None

    @field_validator("avatar_url", "cover_image_url")
    @classmethod
    def validate_urls(cls, v: str | None) -> str | None:
        return _validate_http_url(v)


class PublicProfileResponse(BaseModel):
    """Public-facing profile - no email, no private settings."""

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
