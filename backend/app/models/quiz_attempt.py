"""QuizAttempt model - records a learner's quiz submission and score."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Index, Integer, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.types import JSONVariant, UUIDType


class QuizAttempt(Base):
    """Records the result of a learner taking a quiz.

    Stores the answers given, score achieved, and whether the attempt
    resulted in a passing grade. Multiple attempts per user per lesson
    are allowed - the best score is used for analytics.
    """

    __tablename__ = "quiz_attempts"
    __table_args__ = (Index("idx_quiz_attempts_user_lesson", "user_id", "lesson_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    lesson_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType,
        ForeignKey("lessons.id", ondelete="CASCADE"),
        nullable=False,
    )
    answers: Mapped[dict] = mapped_column(
        JSONVariant,
        nullable=False,
        comment="Map of question_id -> selected_option_index",
    )
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    total: Mapped[int] = mapped_column(Integer, nullable=False)
    percentage: Mapped[float] = mapped_column(Float, nullable=False)
    passed: Mapped[bool] = mapped_column(nullable=False, default=False)
    completed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
