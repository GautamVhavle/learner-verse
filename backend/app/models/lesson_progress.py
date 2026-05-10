"""LessonProgress model — tracks per-user lesson completion state."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.types import UUIDType


class LessonProgress(Base):
    """One row per (user, lesson) pair tracking completion state.

    Toggling a lesson marks/unmarks it as completed and records
    the completion timestamp accordingly.
    """

    __tablename__ = "lesson_progress"

    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    lesson_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType,
        ForeignKey("lessons.id", ondelete="CASCADE"),
        nullable=False,
    )
    completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("user_id", "lesson_id", name="uq_lesson_progress_user_lesson"),
    )
