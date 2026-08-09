"""Pure validation and normalization for CourseBuildSpec v1."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, ValidationError

from app.production.canonical import checksum
from app.production.compatibility import schema_migrations
from app.production.errors import ProductionDomainError, ProductionErrorCode
from app.production.schemas.v1.course_build import (
    AssetMode,
    CourseBuildSpec,
    DurationPolicy,
)

WORDS_PER_MINUTE = 150
MIN_SCENE_SECONDS = 3.0
GENERATED_ASSET_ESTIMATE = 0.08
NARRATION_MINUTE_ESTIMATE = 0.03
RENDER_MINUTE_ESTIMATE = 0.02


class ValidationIssue(BaseModel):
    code: str
    message: str
    field_path: str
    suggested_fix: str | None = None


class RequiredAsset(BaseModel):
    logical_id: str
    mode: AssetMode


class NormalizedScene(BaseModel):
    id: str
    type: str
    duration_seconds: float
    asset_refs: list[str]
    on_screen_text: list[str]


class NormalizedLesson(BaseModel):
    id: str
    title: str
    narration: str
    estimated_duration_seconds: float
    scenes: list[NormalizedScene]


class NormalizedSection(BaseModel):
    id: str
    title: str
    lessons: list[NormalizedLesson]


class NormalizedCourseBuildPlan(BaseModel):
    schema_version: str
    compiler_version: str = "course-build-compiler/1"
    template_version: str
    course_title: str
    sections: list[NormalizedSection]
    estimated_duration_seconds: float


class SpecValidationResult(BaseModel):
    valid: bool
    errors: list[ValidationIssue] = Field(default_factory=list)
    warnings: list[ValidationIssue] = Field(default_factory=list)
    required_assets: list[RequiredAsset] = Field(default_factory=list)
    estimated_duration_seconds: float | None = None
    estimated_cost: float | None = None
    spec_checksum: str | None = None
    normalized_plan: NormalizedCourseBuildPlan | None = None


def _json_pointer(location: tuple[object, ...]) -> str:
    if not location:
        return "/"
    return "/" + "/".join(str(part).replace("~", "~0").replace("/", "~1") for part in location)


class ProductionSpecService:
    """Validates documents without I/O, mutation, or provider access."""

    def validate(self, payload: CourseBuildSpec | dict[str, Any]) -> SpecValidationResult:
        try:
            raw_payload = (
                payload.model_dump(by_alias=True, mode="json")
                if isinstance(payload, CourseBuildSpec)
                else payload
            )
            if not isinstance(raw_payload, dict):
                raise ProductionDomainError(
                    ProductionErrorCode.INVALID_SPEC,
                    "CourseBuildSpec must be a JSON object.",
                    field_path="/",
                    suggested_fix="Supply the complete CourseBuildSpec object.",
                )
            document = CourseBuildSpec.model_validate(schema_migrations.migrate(raw_payload))
        except ProductionDomainError as exc:
            return SpecValidationResult(
                valid=False,
                errors=[
                    ValidationIssue(
                        code=exc.code,
                        message=exc.message,
                        field_path=exc.field_path or "/",
                        suggested_fix=exc.suggested_fix,
                    )
                ],
            )
        except ValidationError as exc:
            return SpecValidationResult(
                valid=False,
                errors=[
                    ValidationIssue(
                        code=ProductionErrorCode.INVALID_SPEC,
                        message=error["msg"],
                        field_path=_json_pointer(error["loc"]),
                        suggested_fix="Correct the value at this path and validate again.",
                    )
                    for error in exc.errors()
                ],
            )

        plan = self.normalize(document)
        estimated_cost = self._estimate_cost(document, plan.estimated_duration_seconds)
        warnings: list[ValidationIssue] = []
        if estimated_cost > document.policies.max_estimated_cost:
            warnings.append(
                ValidationIssue(
                    code="estimated_cost_exceeds_budget",
                    message=(
                        f"Estimated cost {estimated_cost:.2f} exceeds the requested maximum "
                        f"of {document.policies.max_estimated_cost:.2f}."
                    ),
                    field_path="/policies/max_estimated_cost",
                    suggested_fix="Increase the budget or reduce generated assets and narration length.",
                )
            )
        if plan.estimated_duration_seconds > 3 * 60 * 60:
            warnings.append(
                ValidationIssue(
                    code="long_course",
                    message="Estimated course duration exceeds three hours.",
                    field_path="/sections",
                    suggested_fix="Split the course into smaller builds if this is unintended.",
                )
            )

        canonical = document.model_dump(by_alias=True, mode="json")
        return SpecValidationResult(
            valid=True,
            warnings=warnings,
            required_assets=[
                RequiredAsset(logical_id=key, mode=value.mode)
                for key, value in document.assets.items()
            ],
            estimated_duration_seconds=plan.estimated_duration_seconds,
            estimated_cost=estimated_cost,
            spec_checksum=checksum(canonical),
            normalized_plan=plan,
        )

    def normalize(self, document: CourseBuildSpec) -> NormalizedCourseBuildPlan:
        sections: list[NormalizedSection] = []
        total_duration = 0.0
        for section in document.sections:
            lessons: list[NormalizedLesson] = []
            for lesson in section.lessons:
                narration_duration = max(
                    MIN_SCENE_SECONDS,
                    len(lesson.script.narration.split()) / WORDS_PER_MINUTE * 60,
                )
                fit_scene_count = sum(
                    scene.duration_policy is DurationPolicy.FIT_NARRATION
                    for scene in lesson.script.scenes
                )
                fitted_duration = narration_duration / fit_scene_count if fit_scene_count else 0.0
                scenes = [
                    NormalizedScene(
                        id=scene.id,
                        type=scene.type,
                        duration_seconds=scene.duration_seconds
                        if scene.duration_policy is DurationPolicy.FIXED
                        else round(max(MIN_SCENE_SECONDS, fitted_duration), 3),
                        asset_refs=scene.asset_refs,
                        on_screen_text=scene.on_screen_text,
                    )
                    for scene in lesson.script.scenes
                ]
                lesson_duration = round(sum(scene.duration_seconds for scene in scenes), 3)
                total_duration += lesson_duration
                lessons.append(
                    NormalizedLesson(
                        id=lesson.id,
                        title=lesson.title,
                        narration=lesson.script.narration,
                        estimated_duration_seconds=lesson_duration,
                        scenes=scenes,
                    )
                )
            sections.append(NormalizedSection(id=section.id, title=section.title, lessons=lessons))
        return NormalizedCourseBuildPlan(
            schema_version=document.schema_version,
            template_version=document.defaults.template,
            course_title=document.course.title,
            sections=sections,
            estimated_duration_seconds=round(total_duration, 3),
        )

    @staticmethod
    def _estimate_cost(document: CourseBuildSpec, duration_seconds: float) -> float:
        generated_assets = sum(asset.mode is AssetMode.NEW for asset in document.assets.values())
        minutes = duration_seconds / 60
        return round(
            generated_assets * GENERATED_ASSET_ESTIMATE
            + minutes * NARRATION_MINUTE_ESTIMATE
            + minutes * RENDER_MINUTE_ESTIMATE,
            4,
        )
