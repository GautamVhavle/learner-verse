"""Tag model and course_tags junction table for many-to-many tagging."""

import uuid

from sqlalchemy import Column, ForeignKey, String, Table, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.types import UUIDType

# Junction table: each row links one Course to one Tag.
course_tags = Table(
    "course_tags",
    Base.metadata,
    Column(
        "course_id",
        UUIDType,
        ForeignKey("courses.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column("tag_id", UUIDType, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Tag(Base):
    """User-scoped tag for categorising courses. Tag names are unique per user."""

    __tablename__ = "tags"
    __table_args__ = (UniqueConstraint("user_id", "name", name="uq_tags_user_name"),)

    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)

    courses: Mapped[list["Course"]] = relationship(  # noqa: F821
        secondary=course_tags, back_populates="tags", lazy="selectin"
    )
