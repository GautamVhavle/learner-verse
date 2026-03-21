"""API endpoints for learning statistics, streaks, and activity heatmaps."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.stats import (
    ActivityResponse,
    StatsOverviewResponse,
    StreakResponse,
)
from app.services.stats_service import StatsService

router = APIRouter(prefix="/stats", tags=["stats"])


def _service(db: AsyncSession) -> StatsService:
    return StatsService(db)


@router.get("/overview", response_model=StatsOverviewResponse)
async def get_overview(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get overall learning stats: courses completed, lessons done, streaks."""
    return await _service(db).get_overview(user.id)


@router.get("/streak", response_model=StreakResponse)
async def get_streak(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current and longest streak info."""
    return await _service(db).get_streak(user.id)


@router.get("/activity", response_model=ActivityResponse)
async def get_activity(
    months: int = Query(12, ge=1, le=24),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get activity heatmap data for the last N months."""
    return await _service(db).get_activity(user.id, months=months)
