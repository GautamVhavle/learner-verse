"""User model — represents an authenticated learner/creator."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class User(Base):
    """Platform user with profile settings and authentication metadata.

    Supports both Clerk-based multi-user auth (via clerk_id) and a
    single-user local development mode (fixed UUID, no Clerk token).
    """

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    clerk_id: Mapped[str | None] = mapped_column(
        String(255), unique=True, nullable=True
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String, nullable=True)
    timezone: Mapped[str] = mapped_column(String(100), default="UTC")
    playback_speed: Mapped[float] = mapped_column(Float, default=1.0)
    font_size: Mapped[str] = mapped_column(String(10), default="normal")
    onboarding_complete: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    certificates: Mapped[list["Certificate"]] = relationship(
        back_populates="user", cascade="all, delete-orphan", lazy="noload"
    )
