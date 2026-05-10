"""Course model — top-level learning container with sections and lessons."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.types import UUIDType


class Course(Base):
    """A course created by a user, containing an ordered tree of sections and lessons.

    Supports soft-deletion (is_deleted + deleted_at), draft/ready status
    workflow, optional goal dates, and many-to-many tagging.
    """

    __tablename__ = "courses"
    __table_args__ = (
        Index("idx_courses_user_id", "user_id"),
        Index("idx_courses_status", "status"),
        Index("idx_courses_deleted", "is_deleted"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    thumbnail_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
    is_public: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    goal_date: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    tags: Mapped[list["Tag"]] = relationship(
        secondary="course_tags", back_populates="courses", lazy="selectin"
    )
    sections: Mapped[list["Section"]] = relationship(
        back_populates=None,
        cascade="all, delete-orphan",
        lazy="noload",
        order_by="Section.position",
    )
    certificates: Mapped[list["Certificate"]] = relationship(
        back_populates="course", cascade="all, delete-orphan", lazy="noload"
    )
