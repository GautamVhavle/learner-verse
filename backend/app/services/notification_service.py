"""Service for managing notifications and generating event-driven alerts.

Handles CRUD operations for notifications and contains the business logic
for evaluating goals, generating pace-warning notifications, and creating
event-driven notifications (enrollment, completion, certificates, streaks).
"""

import uuid
from datetime import date

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.course import Course
from app.models.lesson import Lesson
from app.models.notification import Notification
from app.models.section import Section
from app.repositories.activity_repo import ActivityRepository
from app.repositories.course_repo import CourseRepository
from app.repositories.notification_repo import NotificationRepository
from app.services.progress_service import ProgressService

STREAK_MILESTONES = [3, 7, 14, 30, 60, 100]


class NotificationService:
    """Business logic for notifications - CRUD and auto-generation."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = NotificationRepository(db)

    # ── Queries ──────────────────────────────────────────────

    async def list_notifications(self, user_id: uuid.UUID, limit: int = 50) -> list[Notification]:
        """Return notifications for a user."""
        return await self.repo.list_by_user(user_id, limit)

    async def unread_count(self, user_id: uuid.UUID) -> int:
        """Count unread notifications for a user."""
        return await self.repo.unread_count(user_id)

    # ── Mutations ────────────────────────────────────────────

    async def mark_read(self, notification_id: uuid.UUID, user_id: uuid.UUID) -> Notification:
        """Mark a notification as read. Raises 404 if not found."""
        notification = await self.repo.mark_read(notification_id, user_id)
        if not notification:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found.",
            )
        await self.db.commit()
        return notification

    async def mark_all_read(self, user_id: uuid.UUID) -> int:
        """Mark all notifications as read. Returns count updated."""
        count = await self.repo.mark_all_read(user_id)
        await self.db.commit()
        return count

    async def delete_notification(self, notification_id: uuid.UUID, user_id: uuid.UUID) -> None:
        """Delete a notification. Raises 404 if not found."""
        deleted = await self.repo.delete_one(notification_id, user_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found.",
            )
        await self.db.commit()

    # ── Auto-generation: Pace Warnings ───────────────────────

    async def evaluate_and_notify(self, user_id: uuid.UUID) -> list[Notification]:
        """Evaluate all active goals and generate pace-warning notifications.

        Called on dashboard load. Generates at most one notification per
        course per day to avoid spamming.
        """
        course_repo = CourseRepository(self.db)
        progress_svc = ProgressService(self.db)
        courses = await course_repo.list_courses(user_id)
        created: list[Notification] = []

        for course in courses:
            if not course.goal_date:
                continue

            progress = await progress_svc.get_course_progress(course.id, user_id)
            goal = progress.goal
            if not goal or goal.pace_status in ("completed", "on_track", "ahead"):
                continue

            # Only generate one notification per course per day
            already_notified = await self.repo.has_recent_of_type(
                user_id, "pace_warning", course.title
            )
            if already_notified:
                continue

            if goal.pace_status == "behind":
                notif = await self._create_pace_warning(
                    user_id, course.title, goal.lessons_per_week_needed, goal.days_remaining
                )
                created.append(notif)
            elif goal.pace_status == "overdue":
                notif = await self._create_overdue_warning(user_id, course.title)
                created.append(notif)

        if created:
            await self.db.commit()

        return created

    # ── Private Helpers ──────────────────────────────────────

    async def _create_pace_warning(
        self,
        user_id: uuid.UUID,
        course_title: str,
        lessons_per_week: float,
        days_remaining: int,
    ) -> Notification:
        """Create a pace-warning notification for a behind-schedule course."""
        notification = Notification(
            user_id=user_id,
            type="pace_warning",
            title=f"Falling behind on {course_title}",
            message=(
                f"You need to complete ~{lessons_per_week:.0f} lessons/week "
                f"to finish in {days_remaining} days. Pick up the pace!"
            ),
        )
        return await self.repo.create(notification)

    async def _create_overdue_warning(self, user_id: uuid.UUID, course_title: str) -> Notification:
        """Create an overdue notification for a past-deadline course."""
        notification = Notification(
            user_id=user_id,
            type="pace_warning",
            title=f"{course_title} is overdue",
            message=(
                "Your goal date has passed. Consider updating your goal "
                "or completing remaining lessons."
            ),
        )
        return await self.repo.create(notification)

    # ── Event-Driven Notifications ───────────────────────────

    async def notify_enrollment(self, user_id: uuid.UUID, course_title: str) -> Notification:
        """Create a notification when a user enrolls in a course."""
        notification = Notification(
            user_id=user_id,
            type="enrollment",
            title=f"Enrolled in {course_title}",
            message=f"You've enrolled in {course_title}. Start learning today!",
        )
        notif = await self.repo.create(notification)
        await self.db.commit()
        return notif

    async def notify_course_completed(
        self, user_id: uuid.UUID, course_title: str
    ) -> Notification | None:
        """Create a notification when a user completes all lessons in a course."""
        already = await self.repo.has_recent_of_type(user_id, "course_completed", course_title)
        if already:
            return None
        notification = Notification(
            user_id=user_id,
            type="course_completed",
            title=f"Course completed: {course_title}!",
            message=(
                f"Congratulations! You've finished all lessons in {course_title}. "
                "Generate a certificate to showcase your achievement."
            ),
        )
        notif = await self.repo.create(notification)
        await self.db.commit()
        return notif

    async def notify_certificate_earned(
        self, user_id: uuid.UUID, course_title: str
    ) -> Notification:
        """Create a notification when a certificate is generated."""
        notification = Notification(
            user_id=user_id,
            type="certificate_earned",
            title=f"Certificate earned for {course_title}!",
            message=(
                f"Your certificate for {course_title} is ready. "
                "Share it or download it from your certificates page."
            ),
        )
        notif = await self.repo.create(notification)
        await self.db.commit()
        return notif

    async def notify_goal_set(
        self, user_id: uuid.UUID, course_title: str, goal_date: date
    ) -> Notification:
        """Create a notification when a goal date is set."""
        notification = Notification(
            user_id=user_id,
            type="goal_set",
            title=f"Goal set for {course_title}",
            message=(
                f"You've set a goal to complete {course_title} by "
                f"{goal_date.strftime('%B %d, %Y')}. Stay on track!"
            ),
        )
        notif = await self.repo.create(notification)
        await self.db.commit()
        return notif

    async def notify_streak_milestone(
        self, user_id: uuid.UUID, streak_days: int
    ) -> Notification | None:
        """Create a notification for streak milestones (3, 7, 14, 30, 60, 100 days)."""
        if streak_days not in STREAK_MILESTONES:
            return None
        already = await self.repo.has_recent_of_type(
            user_id, "streak_milestone", f"{streak_days} day"
        )
        if already:
            return None
        notification = Notification(
            user_id=user_id,
            type="streak_milestone",
            title=f"{streak_days}-day learning streak!",
            message=(
                f"Amazing! You've studied for {streak_days} consecutive days. "
                "Keep the momentum going!"
            ),
        )
        notif = await self.repo.create(notification)
        await self.db.commit()
        return notif

    async def check_course_completion_on_lesson_toggle(
        self, lesson_id: uuid.UUID, user_id: uuid.UUID, completed: bool
    ) -> None:
        """After a lesson is toggled complete, check if the course is now 100% done.

        Also checks for streak milestones.
        """
        if not completed:
            return

        # Find the course for this lesson
        result = await self.db.execute(
            select(Course.id, Course.title)
            .join(Section, Section.course_id == Course.id)
            .join(Lesson, Lesson.section_id == Section.id)
            .where(Lesson.id == lesson_id)
        )
        row = result.first()
        if not row:
            return

        course_id, course_title = row

        # Check course progress
        progress_svc = ProgressService(self.db)
        progress = await progress_svc.get_course_progress(course_id, user_id)
        if progress.percentage >= 100:
            await self.notify_course_completed(user_id, course_title)

        # Check streak milestone
        activity_repo = ActivityRepository(self.db)
        all_activity = await activity_repo.get_all(user_id)
        active_dates = sorted(set(a.activity_date for a in all_activity))
        streak = self._compute_current_streak(active_dates, date.today())
        await self.notify_streak_milestone(user_id, streak)

    @staticmethod
    def _compute_current_streak(active_dates: list[date], today: date) -> int:
        """Compute current streak from activity dates (simple, no grace period)."""
        if not active_dates:
            return 0
        if active_dates[-1] != today:
            return 0
        streak = 1
        for i in range(len(active_dates) - 2, -1, -1):
            if (active_dates[i + 1] - active_dates[i]).days == 1:
                streak += 1
            else:
                break
        return streak
