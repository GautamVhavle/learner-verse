"""CourseRating model - user ratings and reviews for published courses."""

import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    SmallInteger,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.types import UUIDType


class CourseRating(Base):
    """A 1-5 star rating with optional review text for a public course.

    Each user may rate a course at most once (enforced by unique constraint).
    """

    __tablename__ = "course_ratings"
    __table_args__ = (
        UniqueConstraint("user_id", "course_id", name="uq_user_course_rating"),
        CheckConstraint("rating >= 1 AND rating <= 5", name="ck_rating_range"),
        Index("idx_ratings_course_id", "course_id"),
        Index("idx_ratings_user_id", "user_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    course_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType,
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
    )
    rating: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    review: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    user = relationship("User", lazy="selectin")
