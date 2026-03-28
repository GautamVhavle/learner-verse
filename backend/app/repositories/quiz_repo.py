"""Repository for quiz question CRUD and quiz attempt storage."""

import uuid

from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.quiz_attempt import QuizAttempt
from app.models.quiz_question import QuizQuestion


class QuizRepository:
    """Data-access layer for quiz questions and attempts."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Questions ─────────────────────────────────────────────

    async def create_question(
        self, lesson_id: uuid.UUID, question: str, options: list[str], correct_option: int
    ) -> QuizQuestion:
        pos = await self._next_question_position(lesson_id)
        q = QuizQuestion(
            lesson_id=lesson_id,
            question=question,
            options=options,
            correct_option=correct_option,
            position=pos,
        )
        self.db.add(q)
        await self.db.flush()
        return q

    async def get_question(self, question_id: uuid.UUID) -> QuizQuestion | None:
        result = await self.db.execute(
            select(QuizQuestion).where(QuizQuestion.id == question_id)
        )
        return result.scalar_one_or_none()

    async def list_questions(self, lesson_id: uuid.UUID) -> list[QuizQuestion]:
        result = await self.db.execute(
            select(QuizQuestion)
            .where(QuizQuestion.lesson_id == lesson_id)
            .order_by(QuizQuestion.position)
        )
        return list(result.scalars().all())

    async def update_question(self, question: QuizQuestion, **kwargs) -> QuizQuestion:
        for key, value in kwargs.items():
            setattr(question, key, value)
        await self.db.flush()
        return question

    async def delete_question(self, question: QuizQuestion) -> None:
        await self.db.delete(question)
        await self.db.flush()

    async def reorder_questions(
        self, lesson_id: uuid.UUID, items: list[dict]
    ) -> list[QuizQuestion]:
        for item in items:
            await self.db.execute(
                update(QuizQuestion)
                .where(QuizQuestion.id == uuid.UUID(str(item["id"])), QuizQuestion.lesson_id == lesson_id)
                .values(position=item["position"])
            )
        await self.db.flush()
        return await self.list_questions(lesson_id)

    async def count_questions(self, lesson_id: uuid.UUID) -> int:
        result = await self.db.execute(
            select(func.count()).where(QuizQuestion.lesson_id == lesson_id)
        )
        return result.scalar_one()

    async def _next_question_position(self, lesson_id: uuid.UUID) -> int:
        result = await self.db.execute(
            select(func.coalesce(func.max(QuizQuestion.position) + 1, 0)).where(
                QuizQuestion.lesson_id == lesson_id
            )
        )
        return result.scalar_one()

    # ── Attempts ──────────────────────────────────────────────

    async def create_attempt(
        self,
        user_id: uuid.UUID,
        lesson_id: uuid.UUID,
        answers: dict,
        score: int,
        total: int,
        percentage: float,
        passed: bool,
    ) -> QuizAttempt:
        attempt = QuizAttempt(
            user_id=user_id,
            lesson_id=lesson_id,
            answers=answers,
            score=score,
            total=total,
            percentage=percentage,
            passed=passed,
        )
        self.db.add(attempt)
        await self.db.flush()
        return attempt

    async def get_attempts(
        self, user_id: uuid.UUID, lesson_id: uuid.UUID
    ) -> list[QuizAttempt]:
        result = await self.db.execute(
            select(QuizAttempt)
            .where(QuizAttempt.user_id == user_id, QuizAttempt.lesson_id == lesson_id)
            .order_by(QuizAttempt.completed_at.desc())
        )
        return list(result.scalars().all())

    async def get_best_attempt(
        self, user_id: uuid.UUID, lesson_id: uuid.UUID
    ) -> QuizAttempt | None:
        result = await self.db.execute(
            select(QuizAttempt)
            .where(QuizAttempt.user_id == user_id, QuizAttempt.lesson_id == lesson_id)
            .order_by(QuizAttempt.percentage.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def count_attempts(
        self, user_id: uuid.UUID, lesson_id: uuid.UUID
    ) -> int:
        result = await self.db.execute(
            select(func.count())
            .where(QuizAttempt.user_id == user_id, QuizAttempt.lesson_id == lesson_id)
        )
        return result.scalar_one()
