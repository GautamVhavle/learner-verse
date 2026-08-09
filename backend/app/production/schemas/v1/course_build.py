"""Strict v1 contract for building a LearnerVerse course from a script."""

from __future__ import annotations

import re
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

SCHEMA_VERSION = "1.0"
SCHEMA_URL = "https://learnerverse.xyz/schemas/course-build-spec-v1.json"
MAX_SECTIONS = 50
MAX_LESSONS = 500
MAX_SCENES_PER_LESSON = 100
MAX_TOTAL_SCENES = 5_000

_LOGICAL_ID = re.compile(r"^[a-z][a-z0-9_-]{0,63}$")


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class SceneType(StrEnum):
    TITLE = "title"
    TEXT = "text"
    IMAGE = "image"
    IMAGE_WITH_CALLOUTS = "image-with-callouts"
    CODE = "code"
    QUOTE = "quote"
    BULLET_LIST = "bullet-list"
    QUIZ_PROMPT = "quiz-prompt"
    SECTION_DIVIDER = "section-divider"
    OUTRO = "outro"


class AssetMode(StrEnum):
    REUSABLE = "reusable"
    NEW = "new"
    UPLOAD = "upload"


class DurationPolicy(StrEnum):
    FIT_NARRATION = "fit_narration"
    FIXED = "fixed"


class MusicSettings(StrictModel):
    enabled: bool = False


class CourseMetadata(StrictModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=10_000)
    category: str = Field(default="other", min_length=1, max_length=30)
    tags: list[str] = Field(default_factory=list, max_length=20)
    publish_when_complete: bool = False

    @field_validator("tags")
    @classmethod
    def unique_tags(cls, value: list[str]) -> list[str]:
        normalised = [tag.lower() for tag in value]
        if len(set(normalised)) != len(normalised):
            raise ValueError("tags must be unique, ignoring case")
        if any(not tag or len(tag) > 50 for tag in value):
            raise ValueError("each tag must contain 1-50 characters")
        return value


class BuildDefaults(StrictModel):
    locale: str = Field(default="en-US", pattern=r"^[a-z]{2,3}(-[A-Z]{2})?$")
    resolution: str = Field(default="1920x1080", pattern=r"^\d{3,5}x\d{3,5}$")
    fps: int = Field(default=30, ge=1, le=60)
    voice_profile: str = Field(default="default", min_length=1, max_length=100)
    caption_style: str = Field(default="learnerverse-default", min_length=1, max_length=100)
    template: str = Field(default="educational-v1", min_length=1, max_length=100)
    music: MusicSettings = Field(default_factory=MusicSettings)


class GenerationRequest(StrictModel):
    prompt: str = Field(min_length=1, max_length=4_000)
    kind: str = Field(default="illustration", min_length=1, max_length=50)
    aspect_ratio: str = Field(default="16:9", pattern=r"^\d{1,2}:\d{1,2}$")


class UploadReference(StrictModel):
    asset_id: str = Field(min_length=1, max_length=64)


class AssetRequest(StrictModel):
    mode: AssetMode
    asset_id: str | None = Field(default=None, min_length=1, max_length=64)
    generation: GenerationRequest | None = None
    upload: UploadReference | None = None
    license_assertion: str = Field(min_length=1, max_length=100)

    @model_validator(mode="after")
    def validate_source(self) -> AssetRequest:
        sources = [self.asset_id is not None, self.generation is not None, self.upload is not None]
        if sum(sources) != 1:
            raise ValueError("exactly one of asset_id, generation, or upload is required")
        expected = {
            AssetMode.REUSABLE: "asset_id",
            AssetMode.NEW: "generation",
            AssetMode.UPLOAD: "upload",
        }[self.mode]
        actual = "asset_id" if self.asset_id else "generation" if self.generation else "upload"
        if actual != expected:
            raise ValueError(f"mode '{self.mode}' requires '{expected}'")
        return self


class Scene(StrictModel):
    id: str = Field(min_length=1, max_length=64)
    type: SceneType
    duration_policy: DurationPolicy = DurationPolicy.FIT_NARRATION
    duration_seconds: float | None = Field(default=None, gt=0, le=600)
    on_screen_text: list[str] = Field(default_factory=list, max_length=20)
    asset_refs: list[str] = Field(default_factory=list, max_length=20)
    speaker_notes: str | None = Field(default=None, max_length=10_000)

    @field_validator("id")
    @classmethod
    def valid_id(cls, value: str) -> str:
        if not _LOGICAL_ID.match(value):
            raise ValueError("must be a lowercase logical ID (letters, digits, _ or -)")
        return value

    @field_validator("on_screen_text")
    @classmethod
    def valid_text(cls, value: list[str]) -> list[str]:
        if any(not item or len(item) > 500 for item in value):
            raise ValueError("on_screen_text items must contain 1-500 characters")
        return value

    @field_validator("asset_refs")
    @classmethod
    def valid_asset_refs(cls, value: list[str]) -> list[str]:
        if len(set(value)) != len(value):
            raise ValueError("asset_refs must be unique within a scene")
        if any(not _LOGICAL_ID.match(item) for item in value):
            raise ValueError("asset_refs must be logical IDs")
        return value

    @model_validator(mode="after")
    def fixed_duration_requires_value(self) -> Scene:
        if self.duration_policy is DurationPolicy.FIXED and self.duration_seconds is None:
            raise ValueError("duration_seconds is required when duration_policy is fixed")
        if (
            self.duration_policy is DurationPolicy.FIT_NARRATION
            and self.duration_seconds is not None
        ):
            raise ValueError("duration_seconds is only allowed when duration_policy is fixed")
        return self


class LessonScript(StrictModel):
    narration: str = Field(min_length=1, max_length=50_000)
    scenes: list[Scene] = Field(min_length=1, max_length=MAX_SCENES_PER_LESSON)

    @model_validator(mode="after")
    def unique_scene_ids(self) -> LessonScript:
        ids = [scene.id for scene in self.scenes]
        if len(ids) != len(set(ids)):
            raise ValueError("scene IDs must be unique within a lesson")
        return self


class QuizQuestionInput(StrictModel):
    question: str = Field(min_length=1, max_length=1_000)
    options: list[str] = Field(min_length=2, max_length=6)
    correct_option: int = Field(ge=0)

    @model_validator(mode="after")
    def correct_option_in_range(self) -> QuizQuestionInput:
        if self.correct_option >= len(self.options):
            raise ValueError("correct_option must point to an option")
        return self


class LessonQuiz(StrictModel):
    questions: list[QuizQuestionInput] = Field(min_length=1, max_length=20)


class LessonBuildSpec(StrictModel):
    id: str = Field(min_length=1, max_length=64)
    title: str = Field(min_length=1, max_length=200)
    learning_objectives: list[str] = Field(min_length=1, max_length=20)
    script: LessonScript
    quiz: LessonQuiz | None = None

    @field_validator("id")
    @classmethod
    def valid_id(cls, value: str) -> str:
        if not _LOGICAL_ID.match(value):
            raise ValueError("must be a lowercase logical ID (letters, digits, _ or -)")
        return value


class SectionBuildSpec(StrictModel):
    id: str = Field(min_length=1, max_length=64)
    title: str = Field(min_length=1, max_length=200)
    lessons: list[LessonBuildSpec] = Field(min_length=1, max_length=MAX_LESSONS)

    @field_validator("id")
    @classmethod
    def valid_id(cls, value: str) -> str:
        if not _LOGICAL_ID.match(value):
            raise ValueError("must be a lowercase logical ID (letters, digits, _ or -)")
        return value

    @model_validator(mode="after")
    def unique_lesson_ids(self) -> SectionBuildSpec:
        ids = [lesson.id for lesson in self.lessons]
        if len(ids) != len(set(ids)):
            raise ValueError("lesson IDs must be unique within a section")
        return self


class BuildPolicies(StrictModel):
    max_estimated_cost: float = Field(default=5.0, ge=0, le=10_000)
    allow_generated_assets: bool = True
    require_human_review_before_publish: bool = True


class CourseBuildSpec(StrictModel):
    schema_url: str = Field(default=SCHEMA_URL, alias="$schema")
    schema_version: str = Field(default=SCHEMA_VERSION, pattern=r"^\d+\.\d+$")
    request_id: str = Field(min_length=8, max_length=128, pattern=r"^[A-Za-z0-9._:-]+$")
    course: CourseMetadata
    defaults: BuildDefaults = Field(default_factory=BuildDefaults)
    sections: list[SectionBuildSpec] = Field(min_length=1, max_length=MAX_SECTIONS)
    assets: dict[str, AssetRequest] = Field(default_factory=dict, max_length=500)
    policies: BuildPolicies = Field(default_factory=BuildPolicies)

    @field_validator("assets")
    @classmethod
    def valid_asset_ids(cls, value: dict[str, AssetRequest]) -> dict[str, AssetRequest]:
        invalid = [key for key in value if not _LOGICAL_ID.match(key)]
        if invalid:
            raise ValueError(f"asset keys must be logical IDs: {', '.join(invalid[:3])}")
        return value

    @model_validator(mode="after")
    def validate_document_references(self) -> CourseBuildSpec:
        if self.schema_version != SCHEMA_VERSION:
            raise ValueError(f"unsupported schema_version '{self.schema_version}'")
        section_ids = [section.id for section in self.sections]
        if len(section_ids) != len(set(section_ids)):
            raise ValueError("section IDs must be unique")
        lesson_ids = [lesson.id for section in self.sections for lesson in section.lessons]
        if len(lesson_ids) != len(set(lesson_ids)):
            raise ValueError("lesson IDs must be unique across the course")
        scene_count = 0
        for section in self.sections:
            for lesson in section.lessons:
                scene_count += len(lesson.script.scenes)
                for scene in lesson.script.scenes:
                    missing = set(scene.asset_refs) - set(self.assets)
                    if missing:
                        raise ValueError(
                            f"scene '{scene.id}' references missing assets: {', '.join(sorted(missing))}"
                        )
        if scene_count > MAX_TOTAL_SCENES:
            raise ValueError(f"course may not contain more than {MAX_TOTAL_SCENES} scenes")
        if not self.policies.allow_generated_assets:
            generated = [key for key, asset in self.assets.items() if asset.mode is AssetMode.NEW]
            if generated:
                raise ValueError("generated assets are disabled by policies")
        if self.course.publish_when_complete and self.policies.require_human_review_before_publish:
            raise ValueError("publish_when_complete conflicts with required human review")
        return self
