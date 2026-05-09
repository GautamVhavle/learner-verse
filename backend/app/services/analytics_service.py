"""Service for creator analytics — aggregate stats, per-course breakdowns, learner info."""

import uuid
from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.certificate import Certificate
from app.models.course import Course
from app.models.enrollment import CourseEnrollment
from app.models.lesson import Lesson
from app.models.lesson_progress import LessonProgress
from app.models.rating import CourseRating
from app.models.section import Section
from app.models.user import User
from app.schemas.analytics import (
    AnalyticsOverview,
    CourseAnalytics,
    CourseAnalyticsList,
    CourseLearnersList,
    CourseRatingsDetail,
    LearnerInfo,
    RatingBucket,
    RatingDetail,
    TopCourse,
    TrendPoint,
)


class AnalyticsService:
    """Computes creator-facing analytics from course, enrollment, progress, and rating data."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Overview ──────────────────────────────────────────────

    async def get_overview(self, creator_id: uuid.UUID, trend_days: int = 30) -> AnalyticsOverview:
        """Aggregate analytics across all of a creator's courses."""
        # Get creator's course IDs (non-deleted)
        course_rows = await self.db.execute(
            select(Course.id, Course.status).where(
                Course.user_id == creator_id, Course.is_deleted.is_(False)
            )
        )
        courses = course_rows.all()
        course_ids = [r[0] for r in courses]
        total_courses = len(course_ids)
        published = sum(1 for r in courses if r[1] == "ready")
        draft = total_courses - published

        if not course_ids:
            return AnalyticsOverview(
                total_courses=0,
                published_courses=0,
                draft_courses=0,
                total_enrollments=0,
                total_completions=0,
                total_lessons=0,
                total_ratings=0,
                average_rating=0.0,
                enrollment_trend=[],
                completion_trend=[],
                rating_distribution=[RatingBucket(stars=s, count=0) for s in range(1, 6)],
            )

        # Total enrollments
        enroll_result = await self.db.execute(
            select(func.count(CourseEnrollment.id)).where(
                CourseEnrollment.course_id.in_(course_ids)
            )
        )
        total_enrollments = enroll_result.scalar_one()

        # Total completions (certificates issued for creator's courses)
        cert_result = await self.db.execute(
            select(func.count(Certificate.id)).where(Certificate.course_id.in_(course_ids))
        )
        total_completions = cert_result.scalar_one()

        # Total lessons across all courses
        lesson_result = await self.db.execute(
            select(func.count(Lesson.id)).where(
                Lesson.section_id.in_(select(Section.id).where(Section.course_id.in_(course_ids)))
            )
        )
        total_lessons = lesson_result.scalar_one()

        # Ratings aggregate
        rating_result = await self.db.execute(
            select(
                func.count(CourseRating.id),
                func.coalesce(func.avg(CourseRating.rating), 0),
            ).where(CourseRating.course_id.in_(course_ids))
        )
        total_ratings, average_rating = rating_result.one()
        average_rating = round(float(average_rating), 1)

        # Rating distribution
        dist_result = await self.db.execute(
            select(CourseRating.rating, func.count(CourseRating.id))
            .where(CourseRating.course_id.in_(course_ids))
            .group_by(CourseRating.rating)
        )
        dist_map = {r[0]: r[1] for r in dist_result.all()}
        rating_distribution = [RatingBucket(stars=s, count=dist_map.get(s, 0)) for s in range(1, 6)]

        # Enrollment trend (last N days)
        cutoff = date.today() - timedelta(days=trend_days)
        enroll_trend_result = await self.db.execute(
            select(
                func.date(CourseEnrollment.enrolled_at),
                func.count(CourseEnrollment.id),
            )
            .where(
                CourseEnrollment.course_id.in_(course_ids),
                func.date(CourseEnrollment.enrolled_at) >= cutoff,
            )
            .group_by(func.date(CourseEnrollment.enrolled_at))
            .order_by(func.date(CourseEnrollment.enrolled_at))
        )
        enrollment_trend = [
            TrendPoint(date=str(r[0]), count=r[1]) for r in enroll_trend_result.all()
        ]

        # Completion trend (certificates issued over last N days)
        cert_trend_result = await self.db.execute(
            select(
                func.date(Certificate.completed_at),
                func.count(Certificate.id),
            )
            .where(
                Certificate.course_id.in_(course_ids),
                func.date(Certificate.completed_at) >= cutoff,
            )
            .group_by(func.date(Certificate.completed_at))
            .order_by(func.date(Certificate.completed_at))
        )
        completion_trend = [TrendPoint(date=str(r[0]), count=r[1]) for r in cert_trend_result.all()]

        return AnalyticsOverview(
            total_courses=total_courses,
            published_courses=published,
            draft_courses=draft,
            total_enrollments=total_enrollments,
            total_completions=total_completions,
            total_lessons=total_lessons,
            total_ratings=total_ratings,
            average_rating=average_rating,
            enrollment_trend=enrollment_trend,
            completion_trend=completion_trend,
            rating_distribution=rating_distribution,
        )

    # ── Per-Course List ───────────────────────────────────────

    async def get_course_analytics(
        self,
        creator_id: uuid.UUID,
        sort: str = "enrollments",
        page: int = 1,
        per_page: int = 20,
    ) -> CourseAnalyticsList:
        """Get analytics breakdown for each of the creator's courses."""
        courses_result = await self.db.execute(
            select(Course).where(Course.user_id == creator_id, Course.is_deleted.is_(False))
        )
        all_courses = list(courses_result.scalars().all())

        if not all_courses:
            return CourseAnalyticsList(items=[], total=0)

        course_ids = [c.id for c in all_courses]

        # Batch: section & lesson counts
        section_counts = await self._section_counts(course_ids)
        lesson_counts = await self._lesson_counts(course_ids)

        # Batch: enrollment counts
        enroll_counts = await self._enrollment_counts(course_ids)

        # Batch: completion counts (certificates)
        completion_counts = await self._completion_counts(course_ids)

        # Batch: rating stats
        rating_stats = await self._rating_stats_batch(course_ids)

        # Batch: rating distributions
        rating_dists = await self._rating_distributions(course_ids)

        # Build items
        items = []
        cutoff = date.today() - timedelta(days=30)
        for c in all_courses:
            s_count = section_counts.get(c.id, 0)
            l_count = lesson_counts.get(c.id, 0)
            e_count = enroll_counts.get(c.id, 0)
            comp_count = completion_counts.get(c.id, 0)
            avg_r, r_count = rating_stats.get(c.id, (0.0, 0))
            dist = rating_dists.get(c.id, {})

            completion_rate = round((comp_count / e_count * 100) if e_count > 0 else 0.0, 1)

            items.append(
                CourseAnalytics(
                    course_id=c.id,
                    title=c.title,
                    thumbnail_url=c.thumbnail_url,
                    status=c.status,
                    is_public=c.is_public,
                    section_count=s_count,
                    lesson_count=l_count,
                    enrollment_count=e_count,
                    completion_count=comp_count,
                    completion_rate=completion_rate,
                    average_rating=avg_r,
                    rating_count=r_count,
                    rating_distribution=[
                        RatingBucket(stars=s, count=dist.get(s, 0)) for s in range(1, 6)
                    ],
                    enrollment_trend=[],  # Filled below for paginated items
                    completion_trend=[],
                    created_at=c.created_at,
                )
            )

        # Sort
        sort_keys = {
            "enrollments": lambda x: x.enrollment_count,
            "completions": lambda x: x.completion_count,
            "rating": lambda x: x.average_rating,
            "newest": lambda x: x.created_at.timestamp() if x.created_at else 0,
            "title": lambda x: x.title.lower(),
        }
        key_fn = sort_keys.get(sort, sort_keys["enrollments"])
        reverse = sort not in ("title",)
        items.sort(key=key_fn, reverse=reverse)

        total = len(items)
        start = (page - 1) * per_page
        paginated = items[start : start + per_page]

        # Fill trends for paginated items only (expensive queries)
        for item in paginated:
            item.enrollment_trend = await self._enrollment_trend(item.course_id, cutoff)
            item.completion_trend = await self._completion_trend(item.course_id, cutoff)

        return CourseAnalyticsList(items=paginated, total=total)

    # ── Single Course Ratings Detail ──────────────────────────

    async def get_course_ratings(
        self, creator_id: uuid.UUID, course_id: uuid.UUID
    ) -> CourseRatingsDetail:
        """Get detailed ratings breakdown for a specific course."""
        course = await self._get_creator_course(creator_id, course_id)

        # Stats
        result = await self.db.execute(
            select(
                func.coalesce(func.avg(CourseRating.rating), 0),
                func.count(CourseRating.id),
            ).where(CourseRating.course_id == course_id)
        )
        avg, count = result.one()

        # Distribution
        dist_result = await self.db.execute(
            select(CourseRating.rating, func.count(CourseRating.id))
            .where(CourseRating.course_id == course_id)
            .group_by(CourseRating.rating)
        )
        dist_map = {r[0]: r[1] for r in dist_result.all()}
        distribution = [RatingBucket(stars=s, count=dist_map.get(s, 0)) for s in range(1, 6)]

        # Recent reviews (with user info)
        reviews_result = await self.db.execute(
            select(CourseRating)
            .where(CourseRating.course_id == course_id)
            .order_by(CourseRating.created_at.desc())
            .limit(50)
        )
        ratings = reviews_result.scalars().all()

        user_ids = list({r.user_id for r in ratings})
        user_map = await self._user_map(user_ids)

        recent_reviews = [
            RatingDetail(
                id=r.id,
                user_name=user_map.get(r.user_id, ("Unknown", None))[0],
                user_avatar=user_map.get(r.user_id, ("Unknown", None))[1],
                rating=r.rating,
                review=r.review,
                created_at=r.created_at,
            )
            for r in ratings
        ]

        return CourseRatingsDetail(
            course_id=course_id,
            course_title=course.title,
            average_rating=round(float(avg), 1),
            rating_count=int(count),
            distribution=distribution,
            recent_reviews=recent_reviews,
        )

    # ── Enrolled Learners ─────────────────────────────────────

    async def get_course_learners(
        self,
        creator_id: uuid.UUID,
        course_id: uuid.UUID,
        page: int = 1,
        per_page: int = 50,
    ) -> CourseLearnersList:
        """Get list of learners enrolled in a creator's course with progress."""
        course = await self._get_creator_course(creator_id, course_id)

        # Get all lesson IDs for this course
        lesson_ids_result = await self.db.execute(
            select(Lesson.id).where(
                Lesson.section_id.in_(select(Section.id).where(Section.course_id == course_id))
            )
        )
        all_lesson_ids = [r[0] for r in lesson_ids_result.all()]
        total_lessons = len(all_lesson_ids)

        # Get enrollments with pagination
        enroll_result = await self.db.execute(
            select(CourseEnrollment)
            .where(CourseEnrollment.course_id == course_id)
            .order_by(CourseEnrollment.enrolled_at.desc())
        )
        all_enrollments = list(enroll_result.scalars().all())
        total = len(all_enrollments)
        start = (page - 1) * per_page
        enrollments = all_enrollments[start : start + per_page]

        if not enrollments:
            return CourseLearnersList(
                course_id=course_id,
                course_title=course.title,
                learners=[],
                total=total,
            )

        user_ids = [e.user_id for e in enrollments]
        user_map = await self._user_map(user_ids)

        # Batch: completed lesson count per user for this course
        if all_lesson_ids:
            progress_result = await self.db.execute(
                select(
                    LessonProgress.user_id,
                    func.count(LessonProgress.id),
                )
                .where(
                    LessonProgress.user_id.in_(user_ids),
                    LessonProgress.lesson_id.in_(all_lesson_ids),
                    LessonProgress.completed.is_(True),
                )
                .group_by(LessonProgress.user_id)
            )
            progress_map = {r[0]: r[1] for r in progress_result.all()}
        else:
            progress_map = {}

        # Check certificates for completion
        cert_result = await self.db.execute(
            select(Certificate.user_id).where(
                Certificate.course_id == course_id,
                Certificate.user_id.in_(user_ids),
            )
        )
        completed_users = set(cert_result.scalars().all())

        learners = []
        for e in enrollments:
            name, avatar = user_map.get(e.user_id, ("Unknown", None))
            done = progress_map.get(e.user_id, 0)
            pct = round((done / total_lessons * 100) if total_lessons > 0 else 0.0, 1)

            learners.append(
                LearnerInfo(
                    user_id=e.user_id,
                    display_name=name,
                    avatar_url=avatar,
                    enrolled_at=e.enrolled_at,
                    lessons_completed=done,
                    total_lessons=total_lessons,
                    progress_percent=pct,
                    completed_course=e.user_id in completed_users,
                )
            )

        return CourseLearnersList(
            course_id=course_id,
            course_title=course.title,
            learners=learners,
            total=total,
        )

    # ── Top Courses ───────────────────────────────────────────

    async def get_top_courses(self, creator_id: uuid.UUID, limit: int = 5) -> list[TopCourse]:
        """Get top N courses by enrollment count."""
        courses_result = await self.db.execute(
            select(Course).where(Course.user_id == creator_id, Course.is_deleted.is_(False))
        )
        courses = list(courses_result.scalars().all())
        if not courses:
            return []

        course_ids = [c.id for c in courses]
        enroll_counts = await self._enrollment_counts(course_ids)
        completion_counts = await self._completion_counts(course_ids)
        rating_stats = await self._rating_stats_batch(course_ids)

        items = []
        for c in courses:
            items.append(
                TopCourse(
                    course_id=c.id,
                    title=c.title,
                    thumbnail_url=c.thumbnail_url,
                    enrollment_count=enroll_counts.get(c.id, 0),
                    completion_count=completion_counts.get(c.id, 0),
                    average_rating=rating_stats.get(c.id, (0.0, 0))[0],
                    rating_count=rating_stats.get(c.id, (0.0, 0))[1],
                )
            )

        items.sort(key=lambda x: x.enrollment_count, reverse=True)
        return items[:limit]

    # ── Private Helpers ───────────────────────────────────────

    async def _get_creator_course(self, creator_id: uuid.UUID, course_id: uuid.UUID) -> Course:
        """Fetch a course that belongs to the creator, or raise 404."""
        from fastapi import HTTPException, status

        result = await self.db.execute(
            select(Course).where(
                Course.id == course_id,
                Course.user_id == creator_id,
                Course.is_deleted.is_(False),
            )
        )
        course = result.scalar_one_or_none()
        if not course:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")
        return course

    async def _section_counts(self, course_ids: list[uuid.UUID]) -> dict[uuid.UUID, int]:
        result = await self.db.execute(
            select(Section.course_id, func.count(Section.id))
            .where(Section.course_id.in_(course_ids))
            .group_by(Section.course_id)
        )
        return {r[0]: r[1] for r in result.all()}

    async def _lesson_counts(self, course_ids: list[uuid.UUID]) -> dict[uuid.UUID, int]:
        result = await self.db.execute(
            select(Section.course_id, func.count(Lesson.id))
            .join(Lesson, Lesson.section_id == Section.id)
            .where(Section.course_id.in_(course_ids))
            .group_by(Section.course_id)
        )
        return {r[0]: r[1] for r in result.all()}

    async def _enrollment_counts(self, course_ids: list[uuid.UUID]) -> dict[uuid.UUID, int]:
        result = await self.db.execute(
            select(CourseEnrollment.course_id, func.count(CourseEnrollment.id))
            .where(CourseEnrollment.course_id.in_(course_ids))
            .group_by(CourseEnrollment.course_id)
        )
        return {r[0]: r[1] for r in result.all()}

    async def _completion_counts(self, course_ids: list[uuid.UUID]) -> dict[uuid.UUID, int]:
        result = await self.db.execute(
            select(Certificate.course_id, func.count(Certificate.id))
            .where(Certificate.course_id.in_(course_ids))
            .group_by(Certificate.course_id)
        )
        return {r[0]: r[1] for r in result.all()}

    async def _rating_stats_batch(
        self, course_ids: list[uuid.UUID]
    ) -> dict[uuid.UUID, tuple[float, int]]:
        result = await self.db.execute(
            select(
                CourseRating.course_id,
                func.coalesce(func.avg(CourseRating.rating), 0),
                func.count(CourseRating.id),
            )
            .where(CourseRating.course_id.in_(course_ids))
            .group_by(CourseRating.course_id)
        )
        return {r[0]: (round(float(r[1]), 1), int(r[2])) for r in result.all()}

    async def _rating_distributions(
        self, course_ids: list[uuid.UUID]
    ) -> dict[uuid.UUID, dict[int, int]]:
        result = await self.db.execute(
            select(CourseRating.course_id, CourseRating.rating, func.count(CourseRating.id))
            .where(CourseRating.course_id.in_(course_ids))
            .group_by(CourseRating.course_id, CourseRating.rating)
        )
        out: dict[uuid.UUID, dict[int, int]] = {}
        for row in result.all():
            out.setdefault(row[0], {})[row[1]] = row[2]
        return out

    async def _enrollment_trend(self, course_id: uuid.UUID, cutoff: date) -> list[TrendPoint]:
        result = await self.db.execute(
            select(
                func.date(CourseEnrollment.enrolled_at),
                func.count(CourseEnrollment.id),
            )
            .where(
                CourseEnrollment.course_id == course_id,
                func.date(CourseEnrollment.enrolled_at) >= cutoff,
            )
            .group_by(func.date(CourseEnrollment.enrolled_at))
            .order_by(func.date(CourseEnrollment.enrolled_at))
        )
        return [TrendPoint(date=str(r[0]), count=r[1]) for r in result.all()]

    async def _completion_trend(self, course_id: uuid.UUID, cutoff: date) -> list[TrendPoint]:
        result = await self.db.execute(
            select(
                func.date(Certificate.completed_at),
                func.count(Certificate.id),
            )
            .where(
                Certificate.course_id == course_id,
                func.date(Certificate.completed_at) >= cutoff,
            )
            .group_by(func.date(Certificate.completed_at))
            .order_by(func.date(Certificate.completed_at))
        )
        return [TrendPoint(date=str(r[0]), count=r[1]) for r in result.all()]

    async def _user_map(self, user_ids: list[uuid.UUID]) -> dict[uuid.UUID, tuple[str, str | None]]:
        """Return {user_id: (display_name, avatar_url)} for a batch of users."""
        if not user_ids:
            return {}
        result = await self.db.execute(
            select(User.id, User.display_name, User.avatar_url).where(User.id.in_(user_ids))
        )
        return {r[0]: (r[1], r[2]) for r in result.all()}
