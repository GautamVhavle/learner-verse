"""Superadmin dashboard endpoints — all routes require superadmin access.

These endpoints are gated by the ``get_superadmin_user`` dependency which
checks the caller's email against the ``SUPERADMIN_EMAILS`` env var.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db, get_superadmin_user
from app.models.user import User
from app.schemas.superadmin import (
    CourseStatusDistribution,
    LessonTypeDistribution,
    PaginatedUserList,
    PaginatedVerificationList,
    PlatformOverview,
    ReviewVerificationRequest,
    TopCourse,
    TopCreator,
    TrendResponse,
    VerificationRequestSummary,
)
from app.services.superadmin_service import SuperadminService

router = APIRouter(prefix="/superadmin", tags=["superadmin"])


def _service(session: AsyncSession = Depends(get_db)) -> SuperadminService:
    return SuperadminService(session)


# ── Overview ─────────────────────────────────────────────────────────────────


@router.get("/overview", response_model=PlatformOverview)
async def get_overview(
    _admin: User = Depends(get_superadmin_user),
    svc: SuperadminService = Depends(_service),
) -> PlatformOverview:
    return await svc.get_platform_overview()


# ── Trends ────────────────────────────────────────────────────────────────────


@router.get("/trends/users", response_model=TrendResponse)
async def user_growth_trend(
    days: int = Query(default=30, ge=7, le=365),
    _admin: User = Depends(get_superadmin_user),
    svc: SuperadminService = Depends(_service),
) -> TrendResponse:
    return await svc.get_user_growth_trend(days=days)


@router.get("/trends/activity", response_model=TrendResponse)
async def activity_trend(
    days: int = Query(default=30, ge=7, le=365),
    _admin: User = Depends(get_superadmin_user),
    svc: SuperadminService = Depends(_service),
) -> TrendResponse:
    return await svc.get_activity_trend(days=days)


@router.get("/trends/enrollments", response_model=TrendResponse)
async def enrollment_trend(
    days: int = Query(default=30, ge=7, le=365),
    _admin: User = Depends(get_superadmin_user),
    svc: SuperadminService = Depends(_service),
) -> TrendResponse:
    return await svc.get_enrollment_trend(days=days)


@router.get("/trends/courses", response_model=TrendResponse)
async def course_creation_trend(
    days: int = Query(default=30, ge=7, le=365),
    _admin: User = Depends(get_superadmin_user),
    svc: SuperadminService = Depends(_service),
) -> TrendResponse:
    return await svc.get_course_creation_trend(days=days)


# ── Distributions ─────────────────────────────────────────────────────────────


@router.get("/distributions/lessons", response_model=LessonTypeDistribution)
async def lesson_type_dist(
    _admin: User = Depends(get_superadmin_user),
    svc: SuperadminService = Depends(_service),
) -> LessonTypeDistribution:
    return await svc.get_lesson_type_distribution()


@router.get("/distributions/courses", response_model=CourseStatusDistribution)
async def course_status_dist(
    _admin: User = Depends(get_superadmin_user),
    svc: SuperadminService = Depends(_service),
) -> CourseStatusDistribution:
    return await svc.get_course_status_distribution()


# ── Top lists ────────────────────────────────────────────────────────────────


@router.get("/top-courses", response_model=list[TopCourse])
async def top_courses(
    limit: int = Query(default=10, ge=1, le=50),
    _admin: User = Depends(get_superadmin_user),
    svc: SuperadminService = Depends(_service),
) -> list[TopCourse]:
    return await svc.get_top_courses(limit=limit)


@router.get("/top-creators", response_model=list[TopCreator])
async def top_creators(
    limit: int = Query(default=10, ge=1, le=50),
    _admin: User = Depends(get_superadmin_user),
    svc: SuperadminService = Depends(_service),
) -> list[TopCreator]:
    return await svc.get_top_creators(limit=limit)


# ── User management ───────────────────────────────────────────────────────────


@router.get("/users", response_model=PaginatedUserList)
async def list_users(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=25, ge=1, le=100),
    search: str | None = Query(default=None),
    _admin: User = Depends(get_superadmin_user),
    svc: SuperadminService = Depends(_service),
) -> PaginatedUserList:
    return await svc.list_users(page=page, per_page=per_page, search=search)


# ── Verifications ─────────────────────────────────────────────────────────────


@router.get("/verifications", response_model=PaginatedVerificationList)
async def list_verifications(
    status: str | None = Query(default=None, pattern="^(pending|approved|rejected)$"),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=25, ge=1, le=100),
    _admin: User = Depends(get_superadmin_user),
    svc: SuperadminService = Depends(_service),
) -> PaginatedVerificationList:
    return await svc.list_verification_requests(status=status, page=page, per_page=per_page)


@router.put("/verifications/{request_id}", response_model=VerificationRequestSummary)
async def review_verification(
    request_id: uuid.UUID,
    body: ReviewVerificationRequest,
    _admin: User = Depends(get_superadmin_user),
    svc: SuperadminService = Depends(_service),
) -> VerificationRequestSummary:
    return await svc.review_verification(request_id=request_id, body=body)
