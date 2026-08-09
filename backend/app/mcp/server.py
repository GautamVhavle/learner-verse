"""LearnerVerse MCP 2026-07-28 server and scoped course-authoring tools."""

from __future__ import annotations

import json
from uuid import UUID

from mcp.server import MCPServer
from mcp.server.auth.middleware.auth_context import get_access_token
from mcp.server.auth.settings import AuthSettings
from mcp.server.transport_security import TransportSecuritySettings
from pydantic import AnyHttpUrl, BaseModel

from app.api.dependencies import SINGLE_USER_ID
from app.core.config import settings
from app.core.database import async_session_maker
from app.jobs.service import JobService
from app.mcp.auth import PersonalTokenVerifier
from app.production.orchestration import BuildSubmissionResult, ProductionOrchestrator
from app.production.render.schemas import RenderManifestV1
from app.production.schemas.v1.course_build import CourseBuildSpec
from app.production.services.spec_service import ProductionSpecService
from app.schemas.course import CourseCreate, CourseUpdate
from app.schemas.course_export import LearnerVerseCourseExportV1
from app.services.course_service import CourseService

INSTRUCTIONS = """LearnerVerse creates curated courses and builds reviewable private course videos. For video, reading, reference-link, and quiz curricula, call create_course_from_export, inspect get_course_for_review, and call publish_course only after explicit authorization. For generated-video production, read learnerverse://workflow and the CourseBuildSpec schema, validate first, submit once with an idempotency key, and poll jobs without busy-looping."""
mcp = MCPServer(
    name="LearnerVerse",
    version="0.1.0",
    instructions=INSTRUCTIONS,
    token_verifier=PersonalTokenVerifier(),
    auth=AuthSettings(
        issuer_url=AnyHttpUrl(settings.MCP_ISSUER_URL),
        resource_server_url=AnyHttpUrl(settings.MCP_PUBLIC_URL),
        required_scopes=["mcp:read"],
    ),
)


class Capabilities(BaseModel):
    protocol_target: str
    tools: list[str]
    mutations_available: bool
    tasks_extension: dict[str, bool]
    next_action: str


@mcp.tool(
    name="get_capabilities",
    description="Return the currently authorized LearnerVerse MCP capabilities.",
    structured_output=True,
)
def get_capabilities() -> Capabilities:
    tools = [
        "validate_course_spec",
        "create_course_from_export",
        "list_courses_for_review",
        "get_course_for_review",
        "publish_course",
    ]
    if settings.PRODUCTION_PIPELINE_ENABLED:
        tools.extend(["build_course_from_spec", "get_job", "cancel_job"])
    return Capabilities(
        protocol_target="2026-07-28",
        tools=tools if settings.MCP_ENABLED else [],
        mutations_available=settings.MCP_ENABLED,
        tasks_extension={"supported": settings.MCP_TASKS_EXTENSION_ENABLED},
        next_action=(
            "Use create_course_from_export for curated video, reading, and quiz courses; "
            "review before calling publish_course with confirm=true."
        ),
    )


class ValidationResult(BaseModel):
    valid: bool
    estimated_cost: float | None = None
    estimated_duration_seconds: float | None = None
    errors: list[dict] = []
    warnings: list[dict] = []


class JobResult(BaseModel):
    job_id: str
    status: str
    stage: str
    progress: int
    retry_after_ms: int
    next_actions: list[str]
    result: dict | None = None


def _mcp_user_id(*required_scopes: str):
    """Resolve ownership from the authenticated PAT and enforce tool scopes."""
    access_token = get_access_token()
    if access_token is not None:
        missing = sorted(set(required_scopes) - set(access_token.scopes))
        if missing:
            raise PermissionError(f"Missing required scopes: {', '.join(missing)}")
        if not access_token.subject:
            raise PermissionError("The MCP token has no user identity.")
        return UUID(access_token.subject)

    # Stdio has no HTTP auth middleware and remains available only in the
    # explicitly configured single-user development mode.
    if settings.SINGLE_USER_MODE:
        return SINGLE_USER_ID
    raise PermissionError("Remote MCP authentication is required.")


@mcp.tool(
    name="validate_course_spec",
    description="Validate a CourseBuildSpec without mutation or charge.",
    structured_output=True,
)
def validate_course_spec(spec: dict) -> ValidationResult:
    result = ProductionSpecService().validate(spec)
    return ValidationResult(
        valid=result.valid,
        estimated_cost=result.estimated_cost,
        estimated_duration_seconds=result.estimated_duration_seconds,
        errors=[item.model_dump() for item in result.errors],
        warnings=[item.model_dump() for item in result.warnings],
    )


@mcp.tool(
    name="build_course_from_spec",
    description="Validate, persist and queue an idempotent course build. Use dry_run before an expensive build.",
    structured_output=True,
)
async def build_course_from_spec(
    spec: dict, idempotency_key: str, dry_run: bool = False
) -> BuildSubmissionResult:
    if not settings.MCP_ENABLED or not settings.PRODUCTION_PIPELINE_ENABLED:
        raise PermissionError("Production MCP workflow is disabled by release controls.")
    async with async_session_maker() as db:
        return await ProductionOrchestrator(db).submit(
            _mcp_user_id("course:write", "render:submit"),
            spec,
            idempotency_key=idempotency_key,
            dry_run=dry_run,
        )


@mcp.tool(
    name="get_job",
    description="Read durable job state. Poll using retry_after_ms; never busy-loop.",
    structured_output=True,
)
async def get_job(job_id: str) -> JobResult:
    import uuid

    async with async_session_maker() as db:
        job = await JobService(db).get(_mcp_user_id("render:read"), uuid.UUID(job_id))
        actions = (
            ["poll get_job"]
            if job.status in {"queued", "running", "retrying"}
            else (["review_build"] if job.stage == "ready_for_review" else ["get_job_result"])
        )
        return JobResult(
            job_id=str(job.id),
            status=job.status,
            stage=job.stage,
            progress=job.progress,
            retry_after_ms=1500,
            next_actions=actions,
            result=job.result,
        )


@mcp.tool(
    name="cancel_job",
    description="Request cancellation of an owned active build job.",
    structured_output=True,
)
async def cancel_job(job_id: str) -> JobResult:
    import uuid

    async with async_session_maker() as db:
        job = await JobService(db).cancel(_mcp_user_id("render:cancel"), uuid.UUID(job_id))
        return JobResult(
            job_id=str(job.id),
            status=job.status,
            stage=job.stage,
            progress=job.progress,
            retry_after_ms=0,
            next_actions=[],
            result=job.result,
        )


class CourseMutationResult(BaseModel):
    course_id: str
    title: str
    status: str
    is_public: bool
    section_count: int
    lesson_count: int
    validation_errors: list[dict]
    course_url: str


class CourseReviewResult(CourseMutationResult):
    course: dict


class CourseSummary(BaseModel):
    course_id: str
    title: str
    status: str
    is_public: bool
    section_count: int
    lesson_count: int
    has_issues: bool
    course_url: str


class CourseListResult(BaseModel):
    courses: list[CourseSummary]
    total: int


def _course_url(course_id: UUID) -> str:
    return f"{settings.FRONTEND_URL.rstrip('/')}/courses/{course_id}"


async def _course_result(
    service: CourseService, course_id: UUID, user_id: UUID
) -> CourseMutationResult:
    course = await service.get_course(course_id, user_id)
    errors = await service.validate_course(course_id, user_id)
    return CourseMutationResult(
        course_id=str(course.id),
        title=course.title,
        status=course.status,
        is_public=course.is_public,
        section_count=course.section_count,
        lesson_count=course.lesson_count,
        validation_errors=[error.model_dump(mode="json") for error in errors],
        course_url=_course_url(course.id),
    )


@mcp.tool(
    name="create_course_from_export",
    description=(
        "Create a private draft course from LearnerVerse export v1 content, including video, "
        "reading, reference-link, and quiz lessons. Review the result before publishing."
    ),
    structured_output=True,
)
async def create_course_from_export(
    payload: dict, thumbnail_url: str | None = None
) -> CourseMutationResult:
    user_id = _mcp_user_id("course:write")
    export = LearnerVerseCourseExportV1.model_validate(payload)
    safe_payload = export.model_dump(mode="python")
    safe_payload["course"]["status"] = "draft"
    safe_payload["course"]["is_public"] = False
    export = LearnerVerseCourseExportV1.model_validate(safe_payload)

    async with async_session_maker() as db:
        service = CourseService(db)
        course = await service.create_course(
            user_id,
            CourseCreate(
                title=export.course.title,
                description=export.course.description,
                thumbnail_url=thumbnail_url,
                category=export.course.category,
                tags=export.course.tags,
            ),
        )
        try:
            imported = await service.import_course(course.id, user_id, export)
        except Exception:
            await db.rollback()
            # Creation commits before import; remove the new empty draft if import fails.
            try:
                await service.soft_delete(course.id, user_id)
                await service.permanent_delete(course.id, user_id)
            except Exception:
                await db.rollback()
            raise
        return await _course_result(service, imported.id, user_id)


@mcp.tool(
    name="list_courses_for_review",
    description="List owned active courses so an agent can resume safely without duplicate creation.",
    structured_output=True,
)
async def list_courses_for_review() -> CourseListResult:
    user_id = _mcp_user_id("course:write")
    async with async_session_maker() as db:
        result = await CourseService(db).list_courses(user_id)
        return CourseListResult(
            courses=[
                CourseSummary(
                    course_id=str(course.id),
                    title=course.title,
                    status=course.status,
                    is_public=course.is_public,
                    section_count=course.section_count,
                    lesson_count=course.lesson_count,
                    has_issues=course.has_issues,
                    course_url=_course_url(course.id),
                )
                for course in result.items
            ],
            total=result.total,
        )


@mcp.tool(
    name="get_course_for_review",
    description="Return an owned course export and validation report before publication.",
    structured_output=True,
)
async def get_course_for_review(course_id: str) -> CourseReviewResult:
    user_id = _mcp_user_id("course:write")
    parsed_id = UUID(course_id)
    async with async_session_maker() as db:
        service = CourseService(db)
        result = await _course_result(service, parsed_id, user_id)
        export = await service.export_course(parsed_id, user_id)
        return CourseReviewResult(**result.model_dump(), course=export)


@mcp.tool(
    name="publish_course",
    description=(
        "Validate and publicly publish an owned course. Requires course:publish and explicit "
        "confirm=true; validation failures leave the course private."
    ),
    structured_output=True,
)
async def publish_course(course_id: str, confirm: bool = False) -> CourseMutationResult:
    if not confirm:
        raise PermissionError("Publishing requires explicit confirm=true.")
    user_id = _mcp_user_id("course:publish")
    parsed_id = UUID(course_id)
    async with async_session_maker() as db:
        service = CourseService(db)
        status_result = await service.update_status(parsed_id, user_id, "ready")
        if not status_result.valid:
            return await _course_result(service, parsed_id, user_id)
        await service.update_course(parsed_id, user_id, CourseUpdate(is_public=True))
        return await _course_result(service, parsed_id, user_id)


@mcp.resource("learnerverse://workflow", name="LearnerVerse workflow", mime_type="text/markdown")
def workflow() -> str:
    return INSTRUCTIONS


@mcp.resource(
    "learnerverse://examples/golden-workflow",
    name="Golden agent workflow",
    mime_type="text/markdown",
)
def golden_workflow() -> str:
    return "get_capabilities → create_course_from_export → get_course_for_review → publish_course(confirm=true) only after explicit user confirmation. Generated-video workflow: read schema → validate_course_spec → dry-run → submit once → poll → review → publish."


@mcp.resource(
    "learnerverse://schema/course-build/v1", name="CourseBuildSpec v1", mime_type="application/json"
)
def course_build_schema() -> str:
    # Generate from the runtime model so FastAPI Cloud deployments made from
    # the backend directory do not depend on repository-root data files.
    return json.dumps(CourseBuildSpec.model_json_schema(by_alias=True), indent=2)


@mcp.resource(
    "learnerverse://schema/render-manifest/v1",
    name="RenderManifestV1",
    mime_type="application/json",
)
def render_manifest_schema() -> str:
    return json.dumps(RenderManifestV1.model_json_schema(), indent=2)


def streamable_app():
    hosts = [value.strip() for value in settings.MCP_ALLOWED_HOSTS.split(",") if value.strip()]
    origins = [value.strip() for value in settings.MCP_ALLOWED_ORIGINS.split(",") if value.strip()]
    return mcp.streamable_http_app(
        streamable_http_path="/",
        stateless_http=True,
        transport_security=TransportSecuritySettings(allowed_hosts=hosts, allowed_origins=origins),
    )
