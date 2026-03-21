"""Pydantic schemas for lesson completion progress and goal pace tracking."""

import uuid
from datetime import date, datetime

from pydantic import BaseModel


class ProgressToggle(BaseModel):
    completed: bool


class LessonProgressResponse(BaseModel):
    lesson_id: uuid.UUID
    completed: bool
    completed_at: datetime | None = None

    model_config = {"from_attributes": True}


class SectionProgressResponse(BaseModel):
    section_id: uuid.UUID
    title: str
    total_lessons: int
    completed_lessons: int


class GoalResponse(BaseModel):
    goal_date: date
    pace_status: str  # "on_track", "ahead", "behind", "completed", "overdue"
    lessons_per_week_needed: float
    days_remaining: int
    completed_early_by_days: int | None = None  # set when completed before goal


class CourseProgressResponse(BaseModel):
    course_id: uuid.UUID
    total_lessons: int
    completed_lessons: int
    percentage: float
    sections: list[SectionProgressResponse]
    lesson_progress: dict[str, bool]  # lesson_id -> completed
    goal: GoalResponse | None = None
