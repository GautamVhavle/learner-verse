"""Pure deterministic compiler from immutable CourseBuildSpec to manifest."""

from __future__ import annotations

import hashlib
import json
import math
import re
from collections.abc import Mapping

from app.production.render.schemas import (
    CaptionCue,
    ManifestAsset,
    RenderLesson,
    RenderManifestV1,
    RenderScene,
    RenderTrack,
)
from app.production.schemas.v1.course_build import CourseBuildSpec, DurationPolicy

_sentences = re.compile(r"(?<=[.!?])\s+|\n+")


def _canonical(value: object) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def _caption_cues(text: str, duration_ms: int) -> list[CaptionCue]:
    chunks = [part.strip() for part in _sentences.split(text) if part.strip()] or [text]
    weights = [max(1, len(chunk.split())) for chunk in chunks]
    total = sum(weights)
    cursor = 0
    cues = []
    for index, (chunk, weight) in enumerate(zip(chunks, weights, strict=True)):
        end = (
            duration_ms
            if index == len(chunks) - 1
            else cursor + max(500, round(duration_ms * weight / total))
        )
        cues.append(CaptionCue(start_ms=cursor, end_ms=end, text=chunk))
        cursor = end
    return cues


def as_webvtt(cues: list[CaptionCue]) -> str:
    def stamp(ms: int) -> str:
        h, rem = divmod(ms, 3600000)
        m, rem = divmod(rem, 60000)
        s, ms = divmod(rem, 1000)
        return f"{h:02}:{m:02}:{s:02}.{ms:03}"

    return (
        "WEBVTT\n\n"
        + "\n\n".join(f"{stamp(c.start_ms)} --> {stamp(c.end_ms)}\n{c.text}" for c in cues)
        + "\n"
    )


class RenderManifestCompiler:
    def compile(
        self, spec: CourseBuildSpec, bound_assets: Mapping[str, ManifestAsset]
    ) -> RenderManifestV1:
        referenced = {
            ref
            for section in spec.sections
            for lesson in section.lessons
            for scene in lesson.script.scenes
            for ref in scene.asset_refs
        }
        missing = referenced - set(bound_assets)
        if missing:
            raise ValueError(
                f"assets must be bound before compilation: {', '.join(sorted(missing))}"
            )
        input_checksum = hashlib.sha256(
            _canonical(
                {
                    "spec": spec.model_dump(by_alias=True, mode="json"),
                    "assets": {k: v.model_dump() for k, v in sorted(bound_assets.items())},
                }
            ).encode()
        ).hexdigest()
        lessons: list[RenderLesson] = []
        for section in spec.sections:
            for lesson in section.lessons:
                narration_ms = max(
                    1000, math.ceil(len(lesson.script.narration.split()) / 2.5 * 1000)
                )
                per_scene = max(1000, narration_ms // len(lesson.script.scenes))
                cursor = 0
                scenes = []
                for index, scene in enumerate(lesson.script.scenes):
                    duration = round(
                        (scene.duration_seconds * 1000)
                        if scene.duration_policy is DurationPolicy.FIXED
                        else per_scene
                    )
                    if (
                        index == len(lesson.script.scenes) - 1
                        and scene.duration_policy is DurationPolicy.FIT_NARRATION
                    ):
                        duration = max(1000, narration_ms - cursor)
                    scenes.append(
                        RenderScene(
                            id=scene.id,
                            type=scene.type.value,
                            start_ms=cursor,
                            duration_ms=duration,
                            on_screen_text=scene.on_screen_text,
                            asset_refs=scene.asset_refs,
                        )
                    )
                    cursor += duration
                captions = _caption_cues(lesson.script.narration, cursor)
                lessons.append(
                    RenderLesson(
                        id=lesson.id,
                        title=lesson.title,
                        duration_ms=cursor,
                        scenes=scenes,
                        captions=captions,
                        tracks=[RenderTrack(kind="narration", start_ms=0, end_ms=cursor)],
                    )
                )
        return RenderManifestV1(
            input_checksum=input_checksum,
            resolution=spec.defaults.resolution,
            fps=spec.defaults.fps,
            locale=spec.defaults.locale,
            template=spec.defaults.template,
            safe_area={"top": 72, "right": 96, "bottom": 96, "left": 96},
            watermark="LearnerVerse preview",
            assets=dict(bound_assets),
            lessons=lessons,
        )
