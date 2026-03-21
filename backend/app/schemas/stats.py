"""Pydantic schemas for learning statistics, streaks, and activity heatmaps."""

from pydantic import BaseModel


class StatsOverviewResponse(BaseModel):
    total_courses_completed: int
    total_lessons_completed: int
    current_streak: int
    longest_streak: int
    most_active_day: str | None  # e.g. "Monday"
    total_active_days: int


class StreakResponse(BaseModel):
    current_streak: int
    longest_streak: int
    last_active_date: str | None


class ActivityDayResponse(BaseModel):
    date: str
    count: int


class ActivityResponse(BaseModel):
    days: list[ActivityDayResponse]
    total_lessons: int
