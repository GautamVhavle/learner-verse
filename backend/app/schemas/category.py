"""Pydantic schemas for category listing with course counts."""

from pydantic import BaseModel


class CategoryResponse(BaseModel):
    slug: str
    name: str
    icon: str
    course_count: int = 0
