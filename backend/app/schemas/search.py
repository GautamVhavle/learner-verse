"""Pydantic schemas for global search results."""

from pydantic import BaseModel


class SearchResultItem(BaseModel):
    id: str
    type: str  # "course" | "lesson" | "section" | "note"
    title: str
    description: str | None = None
    breadcrumb: str  # e.g. "Course > Section > Lesson"
    url: str  # frontend route


class SearchResponse(BaseModel):
    results: list[SearchResultItem]
    query: str
    total: int
