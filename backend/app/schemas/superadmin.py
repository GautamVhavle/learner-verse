"""Pydantic schemas for the superadmin dashboard API.

All schemas here are only used by superadmin-protected endpoints.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel

# ── Shared primitives ────────────────────────────────────────────────────────


class TrendPoint(BaseModel):
    """A single data point for time-series charts (date + count)."""

    date: date
    count: int


# ── Platform overview ────────────────────────────────────────────────────────


class PlatformOverview(BaseModel):
    """Aggregate stats for the entire platform, optionally scoped to a date range."""

    # Users
    total_users: int
    new_users_today: int
    new_users_this_week: int
    new_users_this_month: int
    active_users_today: int
    active_users_this_week: int
    active_users_this_month: int
    total_pro_users: int
    total_verified_creators: int

    # Courses
    total_courses: int
    draft_courses: int
    published_courses: int
    public_courses: int
    total_sections: int
    total_lessons: int
    video_lessons: int
    note_lessons: int
    quiz_lessons: int

    # Learning activity
    total_enrollments: int
    enrollments_today: int
    total_lessons_completed: int
    lessons_completed_today: int
    total_certificates_issued: int
    certificates_today: int

    # Ratings & verification
    total_ratings: int
    average_platform_rating: float
    total_quiz_attempts: int
    pending_verification_requests: int


# ── Trend responses ──────────────────────────────────────────────────────────


class TrendResponse(BaseModel):
    """List of daily trend data points for chart rendering."""

    points: list[TrendPoint]


# ── Distributions ────────────────────────────────────────────────────────────


class LessonTypeDistribution(BaseModel):
    video: int
    note: int
    quiz: int


class CourseStatusDistribution(BaseModel):
    draft: int
    ready: int
    public: int


# ── Top courses & creators ───────────────────────────────────────────────────


class TopCourse(BaseModel):
    course_id: uuid.UUID
    title: str
    creator_name: str
    enrollment_count: int
    completion_rate: float  # 0.0–1.0
    average_rating: float


class TopCreator(BaseModel):
    user_id: uuid.UUID
    display_name: str
    email: str
    avatar_url: str | None
    is_verified_creator: bool
    total_courses: int
    total_enrollments: int


# ── User management ──────────────────────────────────────────────────────────


class AdminUserSummary(BaseModel):
    """Lightweight user row for the admin user list table."""

    id: uuid.UUID
    email: str
    display_name: str
    avatar_url: str | None
    is_pro: bool
    is_verified_creator: bool
    courses_created: int
    courses_enrolled: int
    lessons_completed: int
    certificates_earned: int
    last_active: date | None  # Most recent activity_log date
    joined_at: datetime


class PaginatedUserList(BaseModel):
    items: list[AdminUserSummary]
    total: int
    page: int
    per_page: int


# ── Verification requests ────────────────────────────────────────────────────


class VerificationRequestSummary(BaseModel):
    """Admin inbox item for a creator verification application."""

    id: uuid.UUID
    user_id: uuid.UUID
    user_email: str
    user_display_name: str
    user_avatar_url: str | None
    user_is_verified_creator: bool
    message: str
    status: str  # pending | approved | rejected
    admin_note: str | None
    created_at: datetime
    reviewed_at: datetime | None


class PaginatedVerificationList(BaseModel):
    items: list[VerificationRequestSummary]
    total: int
    page: int
    per_page: int


class ReviewVerificationRequest(BaseModel):
    """Body for approving or rejecting a verification request."""

    action: Literal["approve", "reject"]
    note: str | None = None  # Required on rejection, optional on approval
