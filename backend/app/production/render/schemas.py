"""Strict, serialisable contract consumed by the isolated render worker."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, field_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class CaptionCue(StrictModel):
    start_ms: int = Field(ge=0)
    end_ms: int = Field(gt=0)
    text: str = Field(min_length=1, max_length=500)


class ManifestAsset(StrictModel):
    asset_id: str
    version_id: str
    checksum: str
    object_key: str
    media_type: str


class RenderScene(StrictModel):
    id: str
    type: str
    start_ms: int = Field(ge=0)
    duration_ms: int = Field(gt=0, le=600000)
    on_screen_text: list[str] = Field(default_factory=list)
    asset_refs: list[str] = Field(default_factory=list)


class RenderTrack(StrictModel):
    kind: str
    asset_ref: str | None = None
    start_ms: int = Field(ge=0)
    end_ms: int = Field(gt=0)
    volume: float = Field(default=1, ge=0, le=1)


class RenderLesson(StrictModel):
    id: str
    title: str
    duration_ms: int
    scenes: list[RenderScene]
    captions: list[CaptionCue]
    tracks: list[RenderTrack]


class RenderManifestV1(StrictModel):
    schema_version: str = "1.0"
    input_checksum: str = Field(pattern=r"^[a-f0-9]{64}$")
    resolution: str = Field(pattern=r"^\d+x\d+$")
    fps: int = Field(ge=1, le=60)
    locale: str
    template: str
    safe_area: dict[str, int]
    watermark: str
    assets: dict[str, ManifestAsset]
    lessons: list[RenderLesson]

    @field_validator("lessons")
    @classmethod
    def timeline_is_contiguous(cls, lessons: list[RenderLesson]) -> list[RenderLesson]:
        for lesson in lessons:
            cursor = 0
            for scene in lesson.scenes:
                if scene.start_ms != cursor:
                    raise ValueError("scene timeline must be contiguous")
                cursor += scene.duration_ms
            if cursor != lesson.duration_ms:
                raise ValueError("lesson duration must match scenes")
        return lessons
