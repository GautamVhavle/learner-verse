"""QuizQuestion model — multiple-choice questions belonging to a quiz lesson."""

import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class QuizQuestion(Base):
    """A single multiple-choice question within a quiz lesson.

    Each question has exactly 4 options (stored as a text array)
    and a `correct_option` index (0-3). Questions are ordered
    by `position` within their parent lesson.
    """

    __tablename__ = "quiz_questions"
    __table_args__ = (
        CheckConstraint(
            "correct_option >= 0 AND correct_option <= 3", name="ck_correct_option_range"
        ),
        Index("idx_quiz_questions_lesson_id", "lesson_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lesson_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("lessons.id", ondelete="CASCADE"),
        nullable=False,
    )
    question: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False)
    correct_option: Mapped[int] = mapped_column(Integer, nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
