"""Current MCP 2026-07-28 discovery server; mutations arrive in Batch D."""

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

INSTRUCTIONS = """LearnerVerse builds reviewable private course videos from CourseBuildSpec. Read learnerverse://workflow and the schema resources. Validate first; upload local files only through explicit asset tools; submit once with an idempotency key; poll jobs; approve review and publish only after the user explicitly authorizes publication."""
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
    return Capabilities(
        protocol_target="2026-07-28",
        tools=["validate_course_spec", "build_course_from_spec", "get_job", "cancel_job"]
        if settings.MCP_ENABLED
        else [],
        mutations_available=settings.MCP_ENABLED and settings.PRODUCTION_PIPELINE_ENABLED,
        tasks_extension={"supported": settings.MCP_TASKS_EXTENSION_ENABLED},
        next_action="Read learnerverse://workflow, validate the spec, then submit one idempotent build.",
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


@mcp.resource("learnerverse://workflow", name="LearnerVerse workflow", mime_type="text/markdown")
def workflow() -> str:
    return INSTRUCTIONS


@mcp.resource(
    "learnerverse://examples/golden-workflow",
    name="Golden agent workflow",
    mime_type="text/markdown",
)
def golden_workflow() -> str:
    return "get_capabilities → read schema → validate_course_spec → build_course_from_spec(dry_run=true) → build_course_from_spec(dry_run=false,idempotency_key=...) → get_job until review/completed → approve/publish only with explicit user confirmation."


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
