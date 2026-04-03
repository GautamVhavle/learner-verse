"""API endpoint for public learner profiles."""

import uuid
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.certificate import Certificate
from app.models.lesson_progress import LessonProgress
from app.models.user import User
from app.repositories.activity_repo import ActivityRepository
from app.schemas.stats import ActivityDayResponse
from app.schemas.user import (
    ActivityDayItem,
    PublicCertificateItem,
    PublicProfileResponse,
)
from app.services.stats_service import StatsService

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("/{user_id}", response_model=PublicProfileResponse)
async def get_public_profile(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint: get a learner's profile with stats, certs, and heatmap."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user or not user.is_profile_public:
        raise HTTPException(status_code=404, detail="Profile not found.")

    # Stats
    stats_svc = StatsService(db)
    overview = await stats_svc.get_overview(user_id)

    # Certificates
    cert_result = await db.execute(
        select(Certificate)
        .where(Certificate.user_id == user_id)
        .order_by(Certificate.completed_at.desc())
    )
    certs = cert_result.scalars().all()

    # Activity heatmap (last 12 months)
    activity_repo = ActivityRepository(db)
    today = date.today()
    start_date = today - timedelta(days=365)
    entries = await activity_repo.get_range(user_id, start_date, today)

    return PublicProfileResponse(
        id=user.id,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        bio=user.bio,
        profile_tags=user.profile_tags or [],
        social_links=user.social_links or [],
        cover_image_url=user.cover_image_url,
        member_since=user.created_at,
        total_courses_completed=overview.total_courses_completed,
        total_lessons_completed=overview.total_lessons_completed,
        current_streak=overview.current_streak,
        longest_streak=overview.longest_streak,
        total_active_days=overview.total_active_days,
        certificates=[
            PublicCertificateItem(
                certificate_uid=c.certificate_uid,
                course_title=c.course_title,
                completed_at=c.completed_at,
            )
            for c in certs
        ],
        activity_heatmap=[
            ActivityDayItem(
                date=e.activity_date.isoformat(),
                count=e.lessons_completed,
            )
            for e in entries
        ],
    )
