"""CourseStudyState model - remembers the last-accessed lesson per course."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.types import UUIDType


class CourseStudyState(Base):
    """Tracks which lesson a user last viewed in a given course.

    Used to resume studying from where the user left off.
    One row per (user, course) pair.
    """

    __tablename__ = "course_study_state"
    __table_args__ = (Index("idx_study_state_user_course", "user_id", "course_id", unique=True),)

    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    course_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False
    )
    last_lesson_id: Mapped[uuid.UUID | None] = mapped_column(
        UUIDType, ForeignKey("lessons.id", ondelete="SET NULL"), nullable=True
    )
    last_accessed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
