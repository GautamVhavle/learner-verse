"""Typed, versioned schema for LearnerVerse course import/export v1."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ExportModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ExportReferenceLink(ExportModel):
    url: str = Field(min_length=1, max_length=2000)
    title: str | None = Field(default=None, max_length=500)
    description: str | None = Field(default=None, max_length=2000)
    image: str | None = None
    favicon: str | None = None
    domain: str | None = Field(default=None, max_length=255)
    position: int = Field(default=0, ge=0)


class ExportQuizQuestion(ExportModel):
    question: str = Field(min_length=1, max_length=2000)
    options: list[str] = Field(min_length=4, max_length=4)
    correct_option: int = Field(ge=0, le=3)
    position: int = Field(default=0, ge=0)


class ExportLesson(ExportModel):
    title: str = Field(min_length=1, max_length=200)
    lesson_type: str = Field(default="video", pattern=r"^(video|note|quiz)$")
    position: int = Field(default=0, ge=0)
    youtube_url: str | None = None
    youtube_title: str | None = Field(default=None, max_length=500)
    youtube_thumbnail: str | None = None
    youtube_duration: str | None = Field(default=None, max_length=20)
    youtube_channel: str | None = Field(default=None, max_length=255)
    notes_markdown: str | None = Field(default=None, max_length=50_000)
    reference_links: list[ExportReferenceLink] = Field(default_factory=list, max_length=100)
    quiz_questions: list[ExportQuizQuestion] = Field(default_factory=list, max_length=100)


class ExportSection(ExportModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    position: int = Field(default=0, ge=0)
    lessons: list[ExportLesson] = Field(default_factory=list, max_length=500)


class ExportCourse(ExportModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    status: str = Field(default="draft", pattern=r"^(draft|ready)$")
    is_public: bool = False
    category: str = Field(default="other", max_length=30)
    goal_date: str | None = None
    tags: list[str] = Field(default_factory=list, max_length=20)


class LearnerVerseCourseExportV1(ExportModel):
    format: str = "learnerverse-course-export"
    version: int = 1
    course: ExportCourse
    sections: list[ExportSection] = Field(default_factory=list, max_length=50)

    @model_validator(mode="after")
    def supported_format(self) -> LearnerVerseCourseExportV1:
        if self.format != "learnerverse-course-export" or self.version != 1:
            raise ValueError("Only learnerverse-course-export version 1 is supported.")
        if sum(len(section.lessons) for section in self.sections) > 500:
            raise ValueError("Too many lessons. Maximum 500.")
        return self
