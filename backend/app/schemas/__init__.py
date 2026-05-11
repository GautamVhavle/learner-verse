"""Pydantic request/response schemas for the Learner Verse API.

Organised by domain - one module per aggregate root. Import schemas
from the specific module that owns them::

    from app.schemas.course import CourseCreate, CourseResponse
    from app.schemas.goal import GoalSetRequest, CourseGoalResponse
"""
