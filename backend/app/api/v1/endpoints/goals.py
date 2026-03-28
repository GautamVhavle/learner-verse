"""API endpoints for learning goals (goal dates and pace tracking)."""

import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.repositories.course_repo import CourseRepository
from app.schemas.goal import CourseGoalResponse, GoalSetRequest
from app.services.notification_service import NotificationService
from app.services.progress_service import ProgressService

router = APIRouter(prefix="/goals", tags=["goals"])


@router.get("", response_model=list[CourseGoalResponse])
async def list_goals(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all courses with active goals."""
    repo = CourseRepository(db)
    progress_svc = ProgressService(db)
    courses = await repo.list_courses(user.id)
    results: list[CourseGoalResponse] = []
    for course in courses:
        if not course.goal_date:
            continue
        progress = await progress_svc.get_course_progress(course.id, user.id)
        goal = progress.goal
        results.append(
            CourseGoalResponse(
                course_id=course.id,
                course_title=course.title,
                goal_date=course.goal_date,
                total_lessons=progress.total_lessons,
                completed_lessons=progress.completed_lessons,
                percentage=progress.percentage,
                pace_status=goal.pace_status if goal else None,
                lessons_per_week_needed=goal.lessons_per_week_needed if goal else None,
                days_remaining=goal.days_remaining if goal else None,
                completed_early_by_days=goal.completed_early_by_days if goal else None,
            )
        )
    return results


@router.put("/courses/{course_id}", response_model=CourseGoalResponse)
async def set_goal(
    course_id: uuid.UUID,
    data: GoalSetRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Set, update, or remove a goal date for a course."""
    repo = CourseRepository(db)
    course = await repo.get_by_id(course_id, user.id)
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")

    if data.goal_date and data.goal_date <= date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Goal date must be in the future.",
        )

    await repo.update(course, goal_date=data.goal_date)
    await db.commit()

    # Send goal-set notification (only when setting a new goal, not removing)
    if data.goal_date:
        notif_svc = NotificationService(db)
        await notif_svc.notify_goal_set(user.id, course.title, data.goal_date)

    progress_svc = ProgressService(db)
    progress = await progress_svc.get_course_progress(course_id, user.id)
    goal = progress.goal
    return CourseGoalResponse(
        course_id=course.id,
        course_title=course.title,
        goal_date=data.goal_date,
        total_lessons=progress.total_lessons,
        completed_lessons=progress.completed_lessons,
        percentage=progress.percentage,
        pace_status=goal.pace_status if goal else None,
        lessons_per_week_needed=goal.lessons_per_week_needed if goal else None,
        days_remaining=goal.days_remaining if goal else None,
        completed_early_by_days=goal.completed_early_by_days if goal else None,
    )
