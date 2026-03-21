"""Pydantic schemas for learning goals (goal dates and pace tracking)."""

import uuid
from datetime import date

from pydantic import BaseModel


class GoalSetRequest(BaseModel):
    """Request body for setting or clearing a course goal date."""

    goal_date: date | None


class CourseGoalResponse(BaseModel):
    """Response showing a course's goal status with pace computation."""

    course_id: uuid.UUID
    course_title: str
    goal_date: date | None
    total_lessons: int
    completed_lessons: int
    percentage: float
    pace_status: str | None = None
    lessons_per_week_needed: float | None = None
    days_remaining: int | None = None
    completed_early_by_days: int | None = None
