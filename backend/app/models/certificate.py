"""Certificate model - proof of course completion."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.types import UUIDType


class Certificate(Base):
    """Issued when a user completes 100% of a course's lessons.

    Each certificate has a globally unique shareable UID (e.g. LV-2026-A1B2C3D4)
    and snapshots the course title, section/lesson counts at time of completion.
    """

    __tablename__ = "certificates"

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
    certificate_uid: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    user_name: Mapped[str] = mapped_column(String(255), nullable=False)
    course_title: Mapped[str] = mapped_column(String(200), nullable=False)
    sections_count: Mapped[int] = mapped_column(Integer, nullable=False)
    lessons_count: Mapped[int] = mapped_column(Integer, nullable=False)
    completed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="certificates")
    course: Mapped["Course"] = relationship(back_populates="certificates")
