"""SuperadminService - platform-wide analytics and moderation operations.

All methods require a superadmin-authenticated caller (enforced at the API
layer). The service only reads data; destructive operations are explicit
(review_verification, grant_verified_creator).
"""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import cast, func, literal_column, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.types import Date

from app.models.activity_log import ActivityLog
from app.models.certificate import Certificate
from app.models.course import Course
from app.models.enrollment import CourseEnrollment
from app.models.lesson import Lesson
from app.models.lesson_progress import LessonProgress
from app.models.notification import Notification
from app.models.quiz_attempt import QuizAttempt
from app.models.rating import CourseRating
from app.models.section import Section
from app.models.user import User
from app.models.verification_request import VerificationRequest
from app.schemas.superadmin import (
    AdminUserSummary,
    CourseStatusDistribution,
    LessonTypeDistribution,
    PaginatedUserList,
    PaginatedVerificationList,
    PlatformOverview,
    ReviewVerificationRequest,
    TopCourse,
    TopCreator,
    TrendPoint,
    TrendResponse,
    VerificationRequestSummary,
)


class SuperadminService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    # ── Platform overview ────────────────────────────────────────────────

    async def get_platform_overview(self) -> PlatformOverview:
        s = self._session
        now_utc = datetime.now(UTC)
        today = now_utc.date()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)

        # Users
        total_users = await self._scalar(select(func.count()).select_from(User))
        new_users_today = await self._scalar(
            select(func.count()).select_from(User).where(cast(User.created_at, Date) == today)
        )
        new_users_this_week = await self._scalar(
            select(func.count()).select_from(User).where(cast(User.created_at, Date) >= week_ago)
        )
        new_users_this_month = await self._scalar(
            select(func.count()).select_from(User).where(cast(User.created_at, Date) >= month_ago)
        )
        # Active = has an activity_log row on that date
        active_users_today = await self._scalar(
            select(func.count(func.distinct(ActivityLog.user_id)))
            .select_from(ActivityLog)
            .where(ActivityLog.activity_date == today)
        )
        active_users_this_week = await self._scalar(
            select(func.count(func.distinct(ActivityLog.user_id)))
            .select_from(ActivityLog)
            .where(ActivityLog.activity_date >= week_ago)
        )
        active_users_this_month = await self._scalar(
            select(func.count(func.distinct(ActivityLog.user_id)))
            .select_from(ActivityLog)
            .where(ActivityLog.activity_date >= month_ago)
        )
        total_pro_users = await self._scalar(
            select(func.count()).select_from(User).where(User.is_pro.is_(True))
        )
        total_verified_creators = await self._scalar(
            select(func.count()).select_from(User).where(User.is_verified_creator.is_(True))
        )

        # Courses
        non_deleted = Course.is_deleted.is_(False)
        total_courses = await self._scalar(
            select(func.count()).select_from(Course).where(non_deleted)
        )
        draft_courses = await self._scalar(
            select(func.count()).select_from(Course).where(non_deleted, Course.status == "draft")
        )
        published_courses = await self._scalar(
            select(func.count()).select_from(Course).where(non_deleted, Course.status == "ready")
        )
        public_courses = await self._scalar(
            select(func.count()).select_from(Course).where(non_deleted, Course.is_public.is_(True))
        )
        total_sections = await self._scalar(select(func.count()).select_from(Section))
        total_lessons = await self._scalar(select(func.count()).select_from(Lesson))
        video_lessons = await self._scalar(
            select(func.count()).select_from(Lesson).where(Lesson.lesson_type == "video")
        )
        note_lessons = await self._scalar(
            select(func.count()).select_from(Lesson).where(Lesson.lesson_type == "note")
        )
        quiz_lessons = await self._scalar(
            select(func.count()).select_from(Lesson).where(Lesson.lesson_type == "quiz")
        )

        # Activity
        total_enrollments = await self._scalar(select(func.count()).select_from(CourseEnrollment))
        enrollments_today = await self._scalar(
            select(func.count())
            .select_from(CourseEnrollment)
            .where(cast(CourseEnrollment.enrolled_at, Date) == today)
        )
        total_lessons_completed = await self._scalar(
            select(func.count())
            .select_from(LessonProgress)
            .where(LessonProgress.completed.is_(True))
        )
        lessons_completed_today = await self._scalar(
            select(func.count())
            .select_from(LessonProgress)
            .where(
                LessonProgress.completed.is_(True),
                cast(LessonProgress.completed_at, Date) == today,
            )
        )
        total_certs = await self._scalar(select(func.count()).select_from(Certificate))
        certs_today = await self._scalar(
            select(func.count())
            .select_from(Certificate)
            .where(cast(Certificate.completed_at, Date) == today)
        )

        # Ratings & quiz
        total_ratings = await self._scalar(select(func.count()).select_from(CourseRating))
        avg_rating_row = await s.execute(select(func.coalesce(func.avg(CourseRating.rating), 0.0)))
        average_platform_rating = float(avg_rating_row.scalar() or 0.0)

        total_quiz_attempts = await self._scalar(select(func.count()).select_from(QuizAttempt))

        pending_verif = await self._scalar(
            select(func.count())
            .select_from(VerificationRequest)
            .where(VerificationRequest.status == "pending")
        )

        return PlatformOverview(
            total_users=total_users,
            new_users_today=new_users_today,
            new_users_this_week=new_users_this_week,
            new_users_this_month=new_users_this_month,
            active_users_today=active_users_today,
            active_users_this_week=active_users_this_week,
            active_users_this_month=active_users_this_month,
            total_pro_users=total_pro_users,
            total_verified_creators=total_verified_creators,
            total_courses=total_courses,
            draft_courses=draft_courses,
            published_courses=published_courses,
            public_courses=public_courses,
            total_sections=total_sections,
            total_lessons=total_lessons,
            video_lessons=video_lessons,
            note_lessons=note_lessons,
            quiz_lessons=quiz_lessons,
            total_enrollments=total_enrollments,
            enrollments_today=enrollments_today,
            total_lessons_completed=total_lessons_completed,
            lessons_completed_today=lessons_completed_today,
            total_certificates_issued=total_certs,
            certificates_today=certs_today,
            total_ratings=total_ratings,
            average_platform_rating=round(average_platform_rating, 2),
            total_quiz_attempts=total_quiz_attempts,
            pending_verification_requests=pending_verif,
        )

    # ── Trend helpers ────────────────────────────────────────────────────

    async def get_user_growth_trend(self, days: int = 30) -> TrendResponse:
        """Daily new user signups over the past `days` days."""
        points = await self._daily_trend(
            table=User,
            date_col=cast(User.created_at, Date),
            days=days,
        )
        return TrendResponse(points=points)

    async def get_activity_trend(self, days: int = 30) -> TrendResponse:
        """Daily unique active users (lesson completions) over past `days` days."""
        cutoff = date.today() - timedelta(days=days)
        result = await self._session.execute(
            select(ActivityLog.activity_date, func.count(func.distinct(ActivityLog.user_id)))
            .where(ActivityLog.activity_date >= cutoff)
            .group_by(ActivityLog.activity_date)
            .order_by(ActivityLog.activity_date)
        )
        rows = result.all()
        return TrendResponse(points=[TrendPoint(date=r[0], count=r[1]) for r in rows])

    async def get_enrollment_trend(self, days: int = 30) -> TrendResponse:
        points = await self._daily_trend(
            table=CourseEnrollment,
            date_col=cast(CourseEnrollment.enrolled_at, Date),
            days=days,
        )
        return TrendResponse(points=points)

    async def get_course_creation_trend(self, days: int = 30) -> TrendResponse:
        points = await self._daily_trend(
            table=Course,
            date_col=cast(Course.created_at, Date),
            days=days,
            extra_where=[Course.is_deleted.is_(False)],
        )
        return TrendResponse(points=points)

    # ── Top courses & creators ───────────────────────────────────────────

    async def get_top_courses(self, limit: int = 10) -> list[TopCourse]:
        """Courses ranked by enrollment count with completion rate and rating."""
        stmt = (
            select(
                Course.id,
                Course.title,
                User.display_name,
                func.count(func.distinct(CourseEnrollment.user_id)).label("enrollment_count"),
                func.coalesce(func.avg(CourseRating.rating), 0.0).label("avg_rating"),
            )
            .join(User, User.id == Course.user_id)
            .outerjoin(CourseEnrollment, CourseEnrollment.course_id == Course.id)
            .outerjoin(CourseRating, CourseRating.course_id == Course.id)
            .where(Course.is_deleted.is_(False))
            .group_by(Course.id, Course.title, User.display_name)
            .order_by(func.count(func.distinct(CourseEnrollment.user_id)).desc())
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        rows = result.all()

        top: list[TopCourse] = []
        for row in rows:
            course_id, title, creator_name, enroll_count, avg_rating = row
            # Completion rate = users with a certificate / enrolled users
            completed_count = await self._scalar(
                select(func.count())
                .select_from(Certificate)
                .where(Certificate.course_id == course_id)
            )
            rate = (completed_count / enroll_count) if enroll_count > 0 else 0.0
            top.append(
                TopCourse(
                    course_id=course_id,
                    title=title,
                    creator_name=creator_name,
                    enrollment_count=enroll_count,
                    completion_rate=round(rate, 4),
                    average_rating=round(float(avg_rating), 2),
                )
            )
        return top

    async def get_top_creators(self, limit: int = 10) -> list[TopCreator]:
        """Creators ranked by total enrollments across their courses."""
        stmt = (
            select(
                User.id,
                User.display_name,
                User.email,
                User.avatar_url,
                User.is_verified_creator,
                func.count(func.distinct(Course.id)).label("total_courses"),
                func.count(func.distinct(CourseEnrollment.user_id)).label("total_enrollments"),
            )
            .join(Course, Course.user_id == User.id)
            .outerjoin(CourseEnrollment, CourseEnrollment.course_id == Course.id)
            .where(Course.is_deleted.is_(False))
            .group_by(
                User.id, User.display_name, User.email, User.avatar_url, User.is_verified_creator
            )
            .order_by(func.count(func.distinct(CourseEnrollment.user_id)).desc())
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return [
            TopCreator(
                user_id=r[0],
                display_name=r[1],
                email=r[2],
                avatar_url=r[3],
                is_verified_creator=r[4],
                total_courses=r[5],
                total_enrollments=r[6],
            )
            for r in result.all()
        ]

    # ── Distributions ────────────────────────────────────────────────────

    async def get_lesson_type_distribution(self) -> LessonTypeDistribution:
        result = await self._session.execute(
            select(Lesson.lesson_type, func.count()).group_by(Lesson.lesson_type)
        )
        counts = {r[0]: r[1] for r in result.all()}
        return LessonTypeDistribution(
            video=counts.get("video", 0),
            note=counts.get("note", 0),
            quiz=counts.get("quiz", 0),
        )

    async def get_course_status_distribution(self) -> CourseStatusDistribution:
        result = await self._session.execute(
            select(Course.status, func.count())
            .where(Course.is_deleted.is_(False))
            .group_by(Course.status)
        )
        counts = {r[0]: r[1] for r in result.all()}
        return CourseStatusDistribution(
            draft=counts.get("draft", 0),
            ready=counts.get("ready", 0),
            public=counts.get("ready", 0) if "public" not in counts else counts.get("public", 0),
        )

    # ── User management ──────────────────────────────────────────────────

    async def list_users(
        self,
        page: int = 1,
        per_page: int = 25,
        search: str | None = None,
    ) -> PaginatedUserList:
        base = select(User)
        if search:
            pattern = f"%{search}%"
            base = base.where(User.email.ilike(pattern) | User.display_name.ilike(pattern))

        total = await self._scalar(select(func.count()).select_from(base.subquery()))
        result = await self._session.execute(
            base.order_by(User.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
        )
        users = result.scalars().all()

        items: list[AdminUserSummary] = []
        for u in users:
            courses_created = await self._scalar(
                select(func.count())
                .select_from(Course)
                .where(Course.user_id == u.id, Course.is_deleted.is_(False))
            )
            courses_enrolled = await self._scalar(
                select(func.count())
                .select_from(CourseEnrollment)
                .where(CourseEnrollment.user_id == u.id)
            )
            lessons_completed = await self._scalar(
                select(func.count())
                .select_from(LessonProgress)
                .where(LessonProgress.user_id == u.id, LessonProgress.completed.is_(True))
            )
            certificates_earned = await self._scalar(
                select(func.count()).select_from(Certificate).where(Certificate.user_id == u.id)
            )
            last_active_result = await self._session.execute(
                select(func.max(ActivityLog.activity_date)).where(ActivityLog.user_id == u.id)
            )
            last_active = last_active_result.scalar()

            items.append(
                AdminUserSummary(
                    id=u.id,
                    email=u.email,
                    display_name=u.display_name,
                    avatar_url=u.avatar_url,
                    is_pro=u.is_pro,
                    is_verified_creator=u.is_verified_creator,
                    courses_created=courses_created,
                    courses_enrolled=courses_enrolled,
                    lessons_completed=lessons_completed,
                    certificates_earned=certificates_earned,
                    last_active=last_active,
                    joined_at=u.created_at,
                )
            )
        return PaginatedUserList(items=items, total=total, page=page, per_page=per_page)

    # ── Verification requests ────────────────────────────────────────────

    async def list_verification_requests(
        self,
        status: str | None = None,
        page: int = 1,
        per_page: int = 25,
    ) -> PaginatedVerificationList:
        base = select(VerificationRequest)
        if status:
            base = base.where(VerificationRequest.status == status)

        total = await self._scalar(select(func.count()).select_from(base.subquery()))
        result = await self._session.execute(
            base.order_by(VerificationRequest.created_at.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
        )
        requests = result.scalars().all()

        items = [
            VerificationRequestSummary(
                id=r.id,
                user_id=r.user_id,
                user_email=r.user.email,
                user_display_name=r.user.display_name,
                user_avatar_url=r.user.avatar_url,
                user_is_verified_creator=r.user.is_verified_creator,
                message=r.message,
                status=r.status,
                admin_note=r.admin_note,
                created_at=r.created_at,
                reviewed_at=r.reviewed_at,
            )
            for r in requests
        ]
        return PaginatedVerificationList(items=items, total=total, page=page, per_page=per_page)

    async def review_verification(
        self,
        request_id: uuid.UUID,
        body: ReviewVerificationRequest,
    ) -> VerificationRequestSummary:
        from fastapi import HTTPException
        from fastapi import status as http_status

        if body.action not in ("approve", "reject"):
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="action must be 'approve' or 'reject'",
            )
        if body.action == "reject" and not body.note:
            raise HTTPException(
                status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="A rejection note is required.",
            )

        result = await self._session.execute(
            select(VerificationRequest).where(VerificationRequest.id == request_id)
        )
        req = result.scalar_one_or_none()
        if req is None:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND, detail="Request not found."
            )
        if req.status != "pending":
            raise HTTPException(
                status_code=http_status.HTTP_409_CONFLICT,
                detail="This request has already been reviewed.",
            )

        req.status = "approved" if body.action == "approve" else "rejected"
        req.admin_note = body.note
        req.reviewed_at = datetime.now(UTC)

        if body.action == "approve":
            user_result = await self._session.execute(select(User).where(User.id == req.user_id))
            user = user_result.scalar_one()
            user.is_verified_creator = True
            user.verified_at = datetime.now(UTC)

            # Notify the user
            notif = Notification(
                user_id=req.user_id,
                title="You're now a Verified Creator! 🎉",
                message=(
                    "Congratulations! Your creator verification request has been approved. "
                    "Your profile now displays the Verified Creator badge."
                ),
                type="info",
            )
            self._session.add(notif)
        else:
            # Notify rejection
            note_text = f" Reason: {body.note}" if body.note else ""
            notif = Notification(
                user_id=req.user_id,
                title="Creator Verification Update",
                message=(
                    f"Your creator verification request was not approved at this time.{note_text} "
                    "You're welcome to apply again in the future."
                ),
                type="warning",
            )
            self._session.add(notif)

        await self._session.commit()
        return VerificationRequestSummary(
            id=req.id,
            user_id=req.user_id,
            user_email=req.user.email,
            user_display_name=req.user.display_name,
            user_avatar_url=req.user.avatar_url,
            user_is_verified_creator=req.user.is_verified_creator,
            message=req.message,
            status=req.status,
            admin_note=req.admin_note,
            created_at=req.created_at,
            reviewed_at=req.reviewed_at,
        )

    # ── Revoke verification ────────────────────────────────────────────────

    async def revoke_verification(
        self,
        user_id: uuid.UUID,
        note: str | None = None,
    ) -> dict:
        from fastapi import HTTPException
        from fastapi import status as http_status

        result = await self._session.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user is None:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND, detail="User not found."
            )
        if not user.is_verified_creator:
            raise HTTPException(
                status_code=http_status.HTTP_409_CONFLICT,
                detail="User is not currently a verified creator.",
            )

        user.is_verified_creator = False
        user.verified_at = None

        # Update the most recent approved request to 'revoked'
        req_result = await self._session.execute(
            select(VerificationRequest)
            .where(
                VerificationRequest.user_id == user_id,
                VerificationRequest.status == "approved",
            )
            .order_by(VerificationRequest.created_at.desc())
            .limit(1)
        )
        approved_req = req_result.scalar_one_or_none()
        if approved_req:
            approved_req.status = "revoked"
            approved_req.admin_note = note or "Verification revoked by admin."
            approved_req.reviewed_at = datetime.now(UTC)

        # Send notification
        note_text = f" Reason: {note}" if note else ""
        notif = Notification(
            user_id=user_id,
            title="Verified Creator Status Revoked",
            message=(
                f"Your Verified Creator status has been revoked.{note_text} "
                "You may re-apply for verification in the future."
            ),
            type="warning",
        )
        self._session.add(notif)

        await self._session.commit()
        return {"detail": f"Verification revoked for {user.display_name}."}

    # ── Internal helpers ─────────────────────────────────────────────────

    async def _scalar(self, stmt) -> int:
        result = await self._session.execute(stmt)
        return result.scalar() or 0

    async def _daily_trend(
        self,
        table,
        date_col,
        days: int,
        extra_where: list | None = None,
    ) -> list[TrendPoint]:
        cutoff = date.today() - timedelta(days=days)
        stmt = (
            select(date_col.label("d"), func.count().label("c"))
            .select_from(table)
            .where(date_col >= cutoff)
        )
        if extra_where:
            for condition in extra_where:
                stmt = stmt.where(condition)
        stmt = stmt.group_by(literal_column("d")).order_by(literal_column("d"))
        result = await self._session.execute(stmt)
        return [TrendPoint(date=r[0], count=r[1]) for r in result.all()]
