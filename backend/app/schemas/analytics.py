"""Pydantic schemas for creator analytics — overview, per-course, ratings, learners."""

import uuid
from datetime import date, datetime

from pydantic import BaseModel


# ── Overview (aggregate across all creator's courses) ─────────

class AnalyticsOverview(BaseModel):
    total_courses: int
    published_courses: int
    draft_courses: int
    total_enrollments: int
    total_completions: int
    total_lessons: int
    total_ratings: int
    average_rating: float
    enrollment_trend: list["TrendPoint"]
    completion_trend: list["TrendPoint"]
    rating_distribution: list["RatingBucket"]


class TrendPoint(BaseModel):
    """Single data point for a time-series trend."""
    date: str  # ISO date (YYYY-MM-DD)
    count: int


class RatingBucket(BaseModel):
    """Count of ratings for a specific star value (1-5)."""
    stars: int
    count: int


# ── Per-Course Analytics ──────────────────────────────────────

class CourseAnalytics(BaseModel):
    course_id: uuid.UUID
    title: str
    thumbnail_url: str | None
    status: str
    is_public: bool
    section_count: int
    lesson_count: int
    enrollment_count: int
    completion_count: int
    completion_rate: float  # 0-100 percent
    average_rating: float
    rating_count: int
    rating_distribution: list[RatingBucket]
    enrollment_trend: list[TrendPoint]
    completion_trend: list[TrendPoint]
    created_at: datetime


class CourseAnalyticsList(BaseModel):
    items: list[CourseAnalytics]
    total: int


# ── Course Ratings Detail ────────────────────────────────────

class RatingDetail(BaseModel):
    id: uuid.UUID
    user_name: str
    user_avatar: str | None
    rating: int
    review: str | None
    created_at: datetime


class CourseRatingsDetail(BaseModel):
    course_id: uuid.UUID
    course_title: str
    average_rating: float
    rating_count: int
    distribution: list[RatingBucket]
    recent_reviews: list[RatingDetail]


# ── Enrolled Learners ────────────────────────────────────────

class LearnerInfo(BaseModel):
    user_id: uuid.UUID
    display_name: str
    avatar_url: str | None
    enrolled_at: datetime
    lessons_completed: int
    total_lessons: int
    progress_percent: float  # 0-100
    completed_course: bool


class CourseLearnersList(BaseModel):
    course_id: uuid.UUID
    course_title: str
    learners: list[LearnerInfo]
    total: int


# ── Top Courses (for overview page) ──────────────────────────

class TopCourse(BaseModel):
    course_id: uuid.UUID
    title: str
    thumbnail_url: str | None
    enrollment_count: int
    completion_count: int
    average_rating: float
    rating_count: int
