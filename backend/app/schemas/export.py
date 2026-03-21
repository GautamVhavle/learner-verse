"""Pydantic schemas for course JSON export and import."""

from pydantic import BaseModel, Field


class ReferenceLinkExport(BaseModel):
    url: str
    title: str | None = None
    description: str | None = None
    image: str | None = None
    favicon: str | None = None
    domain: str | None = None
    position: int = 0


class LessonExport(BaseModel):
    title: str
    youtube_url: str | None = None
    youtube_title: str | None = None
    youtube_thumbnail: str | None = None
    youtube_duration: str | None = None
    youtube_channel: str | None = None
    notes_markdown: str | None = None
    position: int = 0
    reference_links: list[ReferenceLinkExport] = Field(default_factory=list)


class SectionExport(BaseModel):
    title: str
    description: str | None = None
    position: int = 0
    lessons: list[LessonExport] = Field(default_factory=list)


class CourseExportData(BaseModel):
    export_version: int = 1
    title: str
    description: str | None = None
    thumbnail_url: str | None = None
    tags: list[str] = Field(default_factory=list)
    sections: list[SectionExport] = Field(default_factory=list)
