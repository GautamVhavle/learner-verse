"""VerificationRequest model — creator badge application submitted by a user."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.types import UUIDType


class VerificationRequest(Base):
    """A creator verification application submitted by a platform user.

    Lifecycle:
      - User submits a message explaining their intent → status="pending"
      - Superadmin approves → status="approved", user.is_verified_creator=True
      - Superadmin rejects → status="rejected" (user can re-apply)

    A user may only have one active (pending) request at a time.
    """

    __tablename__ = "verification_requests"
    __table_args__ = (Index("idx_verification_requests_user_id", "user_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    # The applicant's message explaining their intent and contributions
    message: Mapped[str] = mapped_column(Text, nullable=False)
    # pending | approved | rejected
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    # Optional admin note (required on rejection, optional on approval)
    admin_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationship back to the user (lazy="joined" so admin queries are efficient)
    user: Mapped["User"] = relationship(lazy="joined")  # noqa: F821
