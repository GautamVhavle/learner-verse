"""ActivityLog model - daily lesson-completion counts for streak/heatmap tracking."""

import uuid
from datetime import date

from sqlalchemy import Date, ForeignKey, Index, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.types import UUIDType


class ActivityLog(Base):
    """Aggregated daily activity for a user.

    One row per (user, date). Incremented each time the user marks
    a lesson as complete. Used to compute streaks and heatmaps.
    """

    __tablename__ = "activity_log"

    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    activity_date: Mapped[date] = mapped_column(Date, nullable=False)
    lessons_completed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    __table_args__ = (
        UniqueConstraint("user_id", "activity_date", name="uq_activity_log_user_date"),
        Index("ix_activity_log_user_date", "user_id", "activity_date"),
    )
