"""ReferenceLink model — external URL bookmark attached to a lesson."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class ReferenceLink(Base):
    """An ordered external link attached to a lesson.

    Stores OpenGraph metadata (title, description, image, favicon)
    fetched at creation time for rich link-card rendering.
    """

    __tablename__ = "reference_links"
    __table_args__ = (Index("idx_reference_links_lesson_id", "lesson_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lesson_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False
    )
    url: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[str | None] = mapped_column(String(500), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    image: Mapped[str | None] = mapped_column(Text, nullable=True)
    favicon: Mapped[str | None] = mapped_column(Text, nullable=True)
    domain: Mapped[str | None] = mapped_column(String(255), nullable=True)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    lesson: Mapped["Lesson"] = relationship(back_populates="reference_links")

    def clone_for_lesson(self, target_lesson_id: uuid.UUID) -> "ReferenceLink":
        """Create an in-memory copy of this link attached to a different lesson."""
        return ReferenceLink(
            lesson_id=target_lesson_id,
            url=self.url,
            title=self.title,
            description=self.description,
            image=self.image,
            favicon=self.favicon,
            domain=self.domain,
            position=self.position,
        )
