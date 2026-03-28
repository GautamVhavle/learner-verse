"""Repository for course rating operations."""

import uuid

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.rating import CourseRating


class RatingRepository:
    """Data-access layer for course ratings."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self, user_id: uuid.UUID, course_id: uuid.UUID, rating: int, review: str | None = None
    ) -> CourseRating:
        """Create a rating. Raises IntegrityError if duplicate."""
        obj = CourseRating(user_id=user_id, course_id=course_id, rating=rating, review=review)
        self.db.add(obj)
        await self.db.flush()
        await self.db.refresh(obj, attribute_names=["user"])
        return obj

    async def get_by_user_course(
        self, user_id: uuid.UUID, course_id: uuid.UUID
    ) -> CourseRating | None:
        """Fetch a user's rating for a specific course."""
        result = await self.db.execute(
            select(CourseRating).where(
                CourseRating.user_id == user_id,
                CourseRating.course_id == course_id,
            )
        )
        return result.scalar_one_or_none()

    async def update(self, obj: CourseRating, **kwargs) -> CourseRating:
        """Apply partial updates to a rating."""
        for key, value in kwargs.items():
            if hasattr(obj, key) and value is not None:
                setattr(obj, key, value)
        await self.db.flush()
        return obj

    async def delete(self, user_id: uuid.UUID, course_id: uuid.UUID) -> bool:
        """Delete a user's rating. Returns True if deleted."""
        result = await self.db.execute(
            delete(CourseRating)
            .where(CourseRating.user_id == user_id, CourseRating.course_id == course_id)
            .returning(CourseRating.id)
        )
        return result.rowcount > 0

    async def list_by_course(self, course_id: uuid.UUID) -> list[CourseRating]:
        """List all ratings for a course, newest first."""
        result = await self.db.execute(
            select(CourseRating)
            .where(CourseRating.course_id == course_id)
            .order_by(CourseRating.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_stats(self, course_id: uuid.UUID) -> tuple[float, int]:
        """Return (average_rating, rating_count) for a course."""
        result = await self.db.execute(
            select(
                func.coalesce(func.avg(CourseRating.rating), 0),
                func.count(CourseRating.id),
            ).where(CourseRating.course_id == course_id)
        )
        avg, count = result.one()
        return round(float(avg), 1), int(count)

    async def get_stats_batch(self, course_ids: list[uuid.UUID]) -> dict[uuid.UUID, tuple[float, int]]:
        """Return {course_id: (avg_rating, count)} for multiple courses."""
        if not course_ids:
            return {}
        result = await self.db.execute(
            select(
                CourseRating.course_id,
                func.coalesce(func.avg(CourseRating.rating), 0),
                func.count(CourseRating.id),
            )
            .where(CourseRating.course_id.in_(course_ids))
            .group_by(CourseRating.course_id)
        )
        return {row[0]: (round(float(row[1]), 1), int(row[2])) for row in result.all()}
