"""API endpoints for creator analytics — overview, per-course, ratings, learners."""

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.analytics import (
    AnalyticsOverview,
    CourseAnalyticsList,
    CourseLearnersList,
    CourseRatingsDetail,
    TopCourse,
)
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _service(db: AsyncSession) -> AnalyticsService:
    return AnalyticsService(db)


@router.get("/overview", response_model=AnalyticsOverview)
async def get_overview(
    trend_days: int = Query(30, ge=7, le=365),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get aggregate analytics across all of the creator's courses."""
    return await _service(db).get_overview(user.id, trend_days=trend_days)


@router.get("/courses", response_model=CourseAnalyticsList)
async def get_course_analytics(
    sort: str = Query("enrollments", pattern=r"^(enrollments|completions|rating|newest|title)$"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get per-course analytics breakdown for the creator."""
    return await _service(db).get_course_analytics(user.id, sort=sort, page=page, per_page=per_page)


@router.get("/courses/{course_id}/ratings", response_model=CourseRatingsDetail)
async def get_course_ratings(
    course_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get detailed ratings and reviews for a specific course."""
    return await _service(db).get_course_ratings(user.id, course_id)


@router.get("/courses/{course_id}/learners", response_model=CourseLearnersList)
async def get_course_learners(
    course_id: uuid.UUID,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get list of enrolled learners and their progress for a course."""
    return await _service(db).get_course_learners(user.id, course_id, page=page, per_page=per_page)


@router.get("/top-courses", response_model=list[TopCourse])
async def get_top_courses(
    limit: int = Query(5, ge=1, le=20),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get top courses by enrollment count."""
    return await _service(db).get_top_courses(user.id, limit=limit)
