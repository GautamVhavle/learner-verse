"""Lesson model — individual learning unit with video, notes, and links."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Lesson(Base):
    """A single learning unit within a section.

    Each lesson has a `lesson_type` — either ``"video"`` (YouTube-based)
    or ``"note"`` (markdown-only). The type determines which editing
    sections appear in the builder and which icon is shown in listings.
    """

    __tablename__ = "lessons"
    __table_args__ = (Index("idx_lessons_section_id", "section_id"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    section_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sections.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    lesson_type: Mapped[str] = mapped_column(
        String(10), nullable=False, default="video", server_default="video"
    )
    youtube_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    youtube_title: Mapped[str | None] = mapped_column(String(500), nullable=True)
    youtube_thumbnail: Mapped[str | None] = mapped_column(Text, nullable=True)
    youtube_duration: Mapped[str | None] = mapped_column(String(20), nullable=True)
    youtube_channel: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes_markdown: Mapped[str | None] = mapped_column(Text, nullable=True)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    section: Mapped["Section"] = relationship(back_populates="lessons")
    reference_links: Mapped[list["ReferenceLink"]] = relationship(
        back_populates="lesson", cascade="all, delete-orphan", passive_deletes=True, order_by="ReferenceLink.position"
    )
    quiz_questions: Mapped[list["QuizQuestion"]] = relationship(
        cascade="all, delete-orphan", passive_deletes=True, order_by="QuizQuestion.position"
    )
