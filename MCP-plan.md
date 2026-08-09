# LearnerVerse MCP and End-to-End Course Video Implementation Plan

Status: implementation plan only
Protocol target: MCP `2026-07-28`
Implementation format: 10 phases delivered as five two-phase batches: `1+2`, `3+4`, `5+6`, `7+8`, `9+10`
Primary outcome: from an MCP-enabled IDE, a user supplies a versioned course/script JSON plus new or reusable assets, and an agent can validate, build, render, quality-check, and publish a complete LearnerVerse course with finished lesson videos.

## 1. Executive decision

The current backend is **not yet fully compatible with an MCP server and is not yet capable of producing complete videos**. It is a solid FastAPI LMS/course-management backend, but its video support currently means importing and embedding YouTube URLs. There is no script-to-scene compiler, media asset catalog, narration/caption pipeline, render engine, durable worker queue, finished-video artifact model, or MCP surface.

The recommended implementation is:

1. Keep FastAPI, SQLAlchemy, PostgreSQL, the existing service/repository layers, Auth0, and course/section/lesson models.
2. Add a domain-level course-production API that both REST and MCP call. MCP handlers must never call the REST API internally or duplicate business logic.
3. Add the official Python MCP SDK v2 and mount an `MCPServer` Streamable HTTP ASGI app at `/mcp`. Add a separate stdio entry point for local IDE usage.
4. Target the latest MCP revision, `2026-07-28`, while accepting older client revisions through the official SDK's compatibility behavior.
5. Add a Node/TypeScript Remotion render worker backed by FFmpeg/ffprobe. The Python backend remains the source of truth and job orchestrator.
6. Use durable application jobs as the reliable baseline: MCP tools return quickly with a `job_id`, and agents call status/result/cancel tools. Add the official `io.modelcontextprotocol/tasks` extension only behind capability negotiation and only when the chosen Python SDK version supports it or after a separately conformance-tested adapter is implemented.
7. Support remote IDE clients through MCP OAuth 2.1. Support local/self-hosted IDE clients through stdio. Personal MCP access tokens are a user-visible fallback credential, not a replacement for standards-compliant OAuth.
8. Make the primary agent entry point a single well-described tool, `build_course_from_spec`, backed by granular tools for inspection, correction, retry, and approval.

### Definition of “fully compatible” for this project

LearnerVerse is ready only when all of the following are true:

- A current MCP client can discover server instructions, tools, resources, prompts, protocol version, and capabilities.
- The same domain operations work through REST, MCP Streamable HTTP, and MCP stdio without behavior drift.
- All inputs and outputs use versioned, strict JSON Schemas and structured MCP tool results.
- A complete build survives API restarts and worker restarts, supports retry/cancel, and never depends on an in-process `asyncio.create_task`.
- Every job, resource, asset, artifact, and token is isolated to its authenticated owner.
- A local file path is never assumed to be readable by a remote MCP server; assets follow an explicit upload/registration flow.
- The agent can determine the next safe action from tool descriptions, state-machine responses, validation errors, and server instructions.
- Destructive, expensive, public, or externally visible operations have explicit confirmation boundaries.
- A golden end-to-end test builds a small course from fixture JSON and media, renders playable MP4 files, attaches them to lessons, and verifies the result through both the API and a real MCP client.

## 2. Evidence-based audit of the current repository

### What can be reused

| Existing capability | Evidence in repository | MCP relevance |
|---|---|---|
| Async FastAPI application and ASGI lifecycle | `backend/app/main.py` | The MCP Streamable HTTP ASGI app can be mounted into the existing service. |
| Pydantic v2 schemas | `backend/app/schemas/` | Can generate strict JSON Schema for MCP tool inputs and structured outputs. |
| Service/repository layering | `backend/app/services/`, `backend/app/repositories/` | Correct foundation for transport-neutral domain operations. |
| Course/section/lesson CRUD and ownership checks | `course_service.py`, `section_service.py`, `lesson_service.py` | Reusable for course assembly and publishing. |
| Course JSON import/export | `CourseService.export_course()` and `import_course()` | Useful seed, but the v1 export is not a production/video build specification. |
| AI provider wrapper | `backend/app/core/openrouter.py` | Can be refactored into per-user provider credentials and structured generation services. |
| Local/Supabase storage abstraction | `backend/app/core/storage.py` | Useful interface, but must be extended for large private media, multipart upload, signed access, metadata, and deletion. |
| Auth0 JWT validation and single-user mode | `backend/app/api/dependencies.py` | Useful identity source, but MCP remote authorization metadata/scopes are absent. |
| Database-backed status records for two background actions | `organize_service.py`, `playlist_import_task_service.py` | Shows a polling pattern, but not a durable execution system. |
| Pytest, Vitest, Playwright, Ruff, TypeScript build CI | `backend/tests/`, `frontend/tests/`, `.github/workflows/ci.yml` | Can be expanded with protocol, conformance, worker, media, and E2E tests. |

### Current gaps and severity

| ID | Gap | Evidence/impact | Severity | Remediated in |
|---|---|---|---|---|
| G-01 | No MCP SDK, server, transports, discovery, tools, resources, prompts, or conformance tests | `backend/pyproject.toml` contains no MCP dependency and no MCP module exists. | Blocker | 5, 7, 9 |
| G-02 | Current “video” is a YouTube embed, not generated media | `Lesson` stores `youtube_url` and metadata only. No timeline, composition, or output artifact exists. | Blocker | 2, 4, 6 |
| G-03 | No canonical input contract for script JSON | Course import accepts a raw `dict`, uses handwritten validation, and only supports course/section/lesson fields. | Blocker | 1 |
| G-04 | No scene/timeline compiler or deterministic production manifest | No scene, track, narration, caption, transition, layout, or render-settings model. | Blocker | 2, 4 |
| G-05 | No asset domain | Uploads accept only small images for thumbnail/avatar/cover, read the entire file into memory, and return public URLs. | Blocker | 2, 3 |
| G-06 | Remote MCP cannot read IDE-local asset paths | There is no local bridge, presigned upload, allowed-root policy, checksum flow, or asset registration handshake. | Blocker | 3, 7 |
| G-07 | No media generation/provider abstraction | No image generation, TTS, music/SFX, stock, or reusable-asset resolver. | High | 3, 4 |
| G-08 | No render engine or render worker | No Remotion, FFmpeg, ffprobe, render container, codecs, fonts, or deterministic template versions. | Blocker | 4, 6 |
| G-09 | Existing background work is not durable | `asyncio.create_task` is process-local; rows track status but do not claim/lease work. A restart can orphan work. | Blocker | 2 |
| G-10 | Background task data is created with startup raw DDL | `_ensure_background_task_tables()` bypasses Alembic and creates ephemeral tables with minimal state. | High | 2 |
| G-11 | Existing organize status is insufficiently owner-bound | The status helper selects by short task ID; the route receives user/course but does not bind the status query to the owner. Twelve hex characters provide only 48 bits. | Critical security | 2, 5 |
| G-12 | No idempotency, optimistic concurrency, immutable spec version, or resumable stage checkpoints | Agent retries could duplicate or overwrite work. | Blocker | 1, 2 |
| G-13 | No cancellation, retry policy, dead-letter handling, worker leases, heartbeats, or stage-specific errors | Long video builds cannot be safely operated. | Blocker | 2, 6 |
| G-14 | No MCP OAuth protected-resource metadata or scopes | Auth0 bearer auth for REST does not by itself implement MCP authorization discovery and challenges. | Blocker for remote MCP | 5 |
| G-15 | Single-user mode authenticates every request as one fixed user | Safe only when bound to localhost; dangerous if remotely reachable. | Critical deployment | 5 |
| G-16 | No personal MCP access token lifecycle | Settings has no create/copy-once/list-last-used/revoke UI or hashed scoped tokens. | Required by product request | 5, 8 |
| G-17 | AI provider keys are global environment variables | Users cannot configure personal provider credentials; keys are not encrypted per user. | High | 3, 8 |
| G-18 | No permission separation for read, write, render, publish, delete, credentials, or admin actions | Existing authentication is mostly owner/no-owner, not MCP scopes. | High | 5 |
| G-19 | No MCP-safe tool semantics | No structured results, annotations, idempotency keys, dry-run, confirmation token, next actions, or stable error codes. | Blocker | 5, 7 |
| G-20 | No server instructions telling an agent how to execute the workflow | Agent behavior currently depends on frontend flows and implicit API knowledge. | Blocker | 7 |
| G-21 | No cost/quota/budget controls | AI and rendering can be expensive or unbounded. | High | 3, 5, 8 |
| G-22 | No provenance, copyright/license, consent, or content-safety record for media | Reusable/new assets cannot be audited. | High | 3 |
| G-23 | No private large-object access model | The current Supabase bucket is public and storage URLs are persisted directly. | High | 3 |
| G-24 | No SSRF/redirect/IP-range protections for remotely fetched assets | Existing URL metadata fetch patterns are not a sufficient media-ingestion security boundary. | Critical security | 3 |
| G-25 | No output QA | No duration, stream, codec, corruption, black-frame, silence, loudness, caption, safe-area, or missing-asset checks. | Blocker | 6 |
| G-26 | No course-production observability | Existing Sentry/timing logging lacks job-stage metrics, trace correlation, audit events, and cost usage. | High | 2, 9 |
| G-27 | In-memory rate limiting is per process | It cannot enforce user/token/render limits across replicas. | High | 2, 5 |
| G-28 | CI deployment validates lint/build but not MCP or rendering | No protocol matrix, container render smoke test, or golden media fixtures. | High | 9 |
| G-29 | No compatibility/deprecation policy for specs, tools, or input documents | Agents and saved scripts will break when schemas evolve. | High | 1, 5, 10 |
| G-30 | No backup/retention/deletion policy for source assets and rendered artifacts | Builds may leak storage or become unreproducible. | High | 3, 10 |

### Current readiness score

| Area | Current | Target |
|---|---:|---:|
| Existing LMS domain reuse | 7/10 | 9/10 |
| MCP protocol implementation | 0/10 | 10/10 |
| Script-to-video production | 1/10 | 10/10 |
| Durable orchestration | 2/10 | 9/10 |
| Asset/media pipeline | 1/10 | 9/10 |
| MCP authorization/security | 1/10 | 10/10 |
| Agent discoverability/autonomy | 1/10 | 10/10 |
| End-to-end verification | 2/10 | 10/10 |

Overall: approximately **2/10 for the stated MCP-driven end-to-end goal**. The existing LMS foundation is valuable, but MCP and media production are new subsystems, not a thin adapter.

## 3. Latest MCP baseline and non-negotiable decisions

The implementation agent must re-check these links before coding and pin exact dependency versions in the lockfile. This plan was checked on 2026-08-09.

- [Latest MCP specification (`2026-07-28`)](https://modelcontextprotocol.io/specification/2026-07-28)
- [MCP transports](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports)
- [MCP tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)
- [MCP resources](https://modelcontextprotocol.io/specification/2026-07-28/server/resources)
- [MCP authorization](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization)
- [Official Python SDK](https://github.com/modelcontextprotocol/python-sdk)
- [Python SDK v2 changes](https://github.com/modelcontextprotocol/python-sdk/blob/main/docs/whats-new.md)
- [Mounting MCP in an existing ASGI app](https://py.sdk.modelcontextprotocol.io/run/asgi/)
- [MCP security best practices](https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices)
- [VS Code MCP server setup](https://code.visualstudio.com/docs/agent-customization/mcp-servers)
- [VS Code MCP JSON reference](https://code.visualstudio.com/docs/agents/reference/mcp-configuration)

Required protocol choices:

- Use `mcp` Python SDK **2.x**, pinned to an exact tested version in `backend/pyproject.toml` and `backend/uv.lock`.
- Use `from mcp.server import MCPServer`; do not copy old `FastMCP` v1 tutorials.
- Make `2026-07-28` the primary conformance target. Test at least one legacy client path supported by the SDK.
- Use Streamable HTTP at `/mcp` for deployed use and stdio for IDE-local use. Do not add WebSocket. Do not build new work on legacy HTTP+SSE.
- Keep core requests stateless. Do not key domain state by MCP session ID.
- Use `server/discover`/per-request metadata through the SDK, not a custom handshake.
- Return valid structured tool output and JSON Schema 2020-12-compatible schemas. Validate again at the domain boundary even when the SDK validates.
- Use MCP `InputRequiredResult`/SDK `Resolve(...)` for non-sensitive missing choices or explicit approval when the client supports it. Never request API keys, passwords, or other secrets through elicitation.
- Do not adopt roots, sampling, MCP-level logging, or ping for new workflows; they are deprecated/removed in the latest revision.
- Use standard application logging and OpenTelemetry. Use `subscriptions/listen` only as an optimization; polling must remain correct.
- Use conservative private cache hints for user data and job state; only immutable public documentation/tool metadata may be publicly cached.
- Configure `transport_security` host/origin allowlists. Mounting the MCP ASGI app requires running its session manager inside the FastAPI lifespan.
- For remote authorization, implement OAuth 2.1, PKCE for public clients, RFC 9728 Protected Resource Metadata, authorization-server discovery, audience/resource validation, short-lived access tokens, and scoped `WWW-Authenticate` challenges. Never pass an MCP token downstream to another service.

### Tasks-extension decision

The `2026-07-28` specification moved long-running tasks into the `io.modelcontextprotocol/tasks` extension. The current Python SDK v2 documentation says its previous experimental Tasks API was removed and that the new extension is not yet implemented. Therefore:

1. The production baseline uses normal, fast-returning MCP tools: submit returns `job_id`; status/result/cancel are separate tools/resources.
2. This baseline is fully valid MCP and works across IDE clients even if they do not implement Tasks.
3. Add a `TasksAdapter` interface in Phase 7. Enable the official extension only when both sides advertise it and a supported SDK implementation exists, or after a low-level adapter passes official schema/conformance fixtures.
4. Never return a task-extension result unless the request opted into `io.modelcontextprotocol/tasks`.
5. Do not use the incompatible `2025-11-25` experimental Tasks wire format as a shortcut.

## 4. Target architecture

```text
IDE agent
  |-- stdio --> backend/app/mcp/stdio.py -----------------------|
  |-- HTTPS Streamable HTTP + OAuth --> /mcp -------------------|
                                                               v
                                              MCP adapters (thin)
                                              tools/resources/prompts
                                                               |
                                                               v
                                      Production domain services
                           validate -> plan -> resolve assets -> compile
                              -> narrate -> render -> QA -> publish
                              |                     |
                              v                     v
                       PostgreSQL jobs         object storage
                       specs/events/costs       sources/artifacts
                              |
                              v
                      durable Redis queue
                       |              |
                 media workers   Remotion render workers
                 TTS/assets      Node + Chromium + FFmpeg
                              |
                              v
                    existing Course/Section/Lesson services
```

The REST API, web UI, and MCP layer all call the same application services. Transport-specific code may translate authentication, errors, and representations; it may not own business rules.

### New backend modules

```text
backend/app/
  production/
    schemas/              # CourseBuildSpec v1 and strict sub-schemas
    services/             # validation, planning, assets, compile, publish, QA
    repositories/
    providers/            # AI, TTS, generated image, storage adapters
    errors.py              # stable machine-readable domain error codes
  jobs/
    models.py
    queue.py
    worker.py
    handlers/
  mcp/
    server.py              # MCPServer registration and server instructions
    context.py             # authenticated principal, DB unit of work
    auth.py                # OAuth/PAT verification and scope enforcement
    tools/
    resources/
    prompts/
    stdio.py
    tasks_adapter.py
  api/v1/endpoints/
    production.py
    assets.py
    jobs.py
    credentials.py
    mcp_tokens.py
```

New service:

```text
render-worker/
  src/compositions/
  src/templates/
  src/worker.ts
  src/manifest-schema.ts
  Dockerfile
  package.json
```

### New persistent entities

All UUIDs use cryptographically random UUIDv4/UUIDv7 values. Every user-owned row contains `user_id`; access is never authorized by possession of an ID alone.

- `production_projects`: course association, title, state, active spec version.
- `production_spec_versions`: immutable input JSON, schema version, checksum, creator, validation report.
- `production_runs`: one idempotent attempt, state, current stage, progress, cancel flag, failure code, timestamps, cost budget, correlation ID.
- `job_events`: append-only stage/progress/audit events with safe metadata.
- `job_attempts`: lease owner, heartbeat, attempt, retry time, error classification.
- `assets`: owner, logical name, kind, source type (`uploaded`, `reusable`, `generated`, `remote`), checksum, MIME, dimensions/duration, private storage key, safety/licensing/provenance status.
- `asset_versions`: immutable binary/version metadata and lineage.
- `asset_bindings`: spec slot/scene to resolved asset version.
- `provider_credentials`: provider, encrypted credential envelope, key version, masked label, validation state; never return ciphertext through API/MCP.
- `render_manifests`: immutable compiled manifest, compiler version, template version, checksum.
- `artifacts`: run, lesson/project, kind (`preview`, `video`, `captions`, `thumbnail`, `manifest`, `qa_report`), private storage key, checksum, media metadata.
- `qa_reports`: machine checks, warnings, failures, reviewer decision.
- `mcp_access_tokens`: hashed token, prefix, name, scopes, expiry, last-used time/IP, revoked time. Plain token is shown once.
- `idempotency_records`: owner, operation, idempotency key, request checksum, response reference, expiry.
- `usage_ledger`: provider/render/storage units, estimated/actual cost, run and user.

### State machines

Production run:

```text
draft -> validating -> awaiting_assets -> planned -> queued
      -> generating_assets -> narrating -> compiling -> rendering
      -> quality_check -> ready_for_review -> publishing -> completed

Any active state -> cancelling -> cancelled
Any active state -> failed_retryable -> queued
Any active state -> failed_terminal
ready_for_review -> revision_requested -> queued
```

Asset:

```text
pending_upload|pending_generation -> processing -> ready
                                      |-> quarantined
                                      |-> failed
```

Every transition is an atomic, owner-checked service operation with an append-only event. Workers use leases and heartbeats; expired leases are recoverable.

## 5. Canonical `CourseBuildSpec` contract

Create `backend/app/production/schemas/v1/` and publish its JSON Schema as an MCP resource and REST endpoint. Set Pydantic `extra="forbid"` throughout. The top-level contract must contain:

```json
{
  "$schema": "https://learnerverse.xyz/schemas/course-build-spec-v1.json",
  "schema_version": "1.0",
  "request_id": "client-generated-idempotency-id",
  "course": {
    "title": "Course title",
    "description": "Course description",
    "category": "technology",
    "tags": ["example"],
    "publish_when_complete": false
  },
  "defaults": {
    "locale": "en-US",
    "resolution": "1920x1080",
    "fps": 30,
    "voice_profile": "default",
    "caption_style": "learnerverse-default",
    "template": "educational-v1",
    "music": {"enabled": false}
  },
  "sections": [
    {
      "id": "intro",
      "title": "Introduction",
      "lessons": [
        {
          "id": "welcome",
          "title": "Welcome",
          "learning_objectives": ["Understand the course outcome"],
          "script": {
            "narration": "Welcome to the course.",
            "scenes": [
              {
                "id": "scene-1",
                "type": "title",
                "duration_policy": "fit_narration",
                "on_screen_text": ["Welcome"],
                "asset_refs": ["hero"],
                "speaker_notes": null
              }
            ]
          },
          "quiz": null
        }
      ]
    }
  ],
  "assets": {
    "hero": {
      "mode": "reusable",
      "asset_id": "asset-uuid",
      "generation": null,
      "upload": null,
      "license_assertion": "owned_or_authorized"
    }
  },
  "policies": {
    "max_estimated_cost": 5.0,
    "allow_generated_assets": true,
    "require_human_review_before_publish": true
  }
}
```

Required schema behavior:

- Stable logical IDs are unique within the document and are not database IDs.
- Validate size/count/duration limits before persistence.
- Validate every asset reference, scene type, locale, template, voice, transition, and quiz answer.
- Normalize only into a separate canonical representation; preserve the exact submitted document immutably.
- Return JSON Pointer paths (`/sections/0/lessons/0/script/scenes/0`) in every validation error.
- Produce `errors`, `warnings`, `estimated_duration`, `estimated_cost`, required asset slots, and a deterministic `spec_checksum`.
- Version with explicit migrations (`v1 -> v2`); never silently reinterpret an old document.
- Provide example documents: minimal one-lesson course, full course, uploaded assets, reusable assets, generated assets, captions, quizzes, and invalid fixtures.

## 6. MCP surface designed for agents

Keep the default tool list focused. A huge one-to-one mirror of every REST endpoint makes agent selection worse. Use names with a `learnerverse_` prefix if the client does not namespace by server.

### Primary tools

| Tool | Purpose | Key behavior |
|---|---|---|
| `get_capabilities` | Return supported spec versions, templates, providers, limits, scopes, protocol/features | Read-only, fast, publicly cacheable only if response contains no user data. |
| `validate_course_spec` | Strictly validate and estimate a proposed spec without mutation | Returns structured errors/warnings, required assets, duration/cost estimate, checksum, and next actions. |
| `create_asset_upload` | Create a presigned multipart upload intent for one local asset | Returns upload URL/parts and an `asset_id`; never accepts an arbitrary server file path. |
| `complete_asset_upload` | Verify checksum, MIME, scan state, and finalize the asset | Idempotent and owner-scoped. |
| `search_assets` | Find reusable user-owned assets by kind, tags, checksum, and text | Cursor pagination and private cache hints. |
| `create_or_update_project` | Save a validated immutable spec version and project metadata | Requires idempotency key and expected project version on update. |
| `build_course_from_spec` | Submit the complete plan/generate/render/QA workflow | Default orchestrator tool; supports `dry_run`, budget, publish policy, and idempotency key; returns `job_id` immediately. |
| `get_job` | Return stage, progress, events cursor, warnings, cost, retryability, and next actions | Owner-scoped; stable machine states. |
| `get_job_result` | Return structured final project/course/artifact references | Only valid in terminal completed state. |
| `cancel_job` | Request cooperative cancellation | Idempotent; reports whether cancellation is still possible. |
| `retry_job` | Retry from the last safe checkpoint or selected failed stage | Requires retryable failure and idempotency key. |
| `review_build` | Approve, reject, or request scoped revisions after QA | Approval required before publishing when policy says so. |
| `publish_course` | Attach finished artifacts, mark course ready, optionally publicize | Explicit confirmation; never implied by “build.” |
| `delete_project` | Soft-delete production data | Destructive annotation and explicit confirmation; hard deletion is not an MCP tool. |

Granular diagnostic tools may include `resolve_assets`, `render_preview`, `run_quality_checks`, and `repair_scene`, but they should be hidden from the default tool set unless the client supports tool groups or the agent asks for advanced tools.

Every tool result follows a shared envelope:

```json
{
  "ok": true,
  "operation": "build_course_from_spec",
  "data": {},
  "warnings": [],
  "error": null,
  "next_actions": [
    {"tool": "get_job", "arguments": {"job_id": "..."}, "when": "after 2 seconds"}
  ],
  "correlation_id": "...",
  "schema_version": "1.0"
}
```

Errors must be actionable and safe for the model: `code`, `message`, `retryable`, `field_path`, `details`, and `suggested_fix`. Expected domain failures return MCP tool results with `isError=true`; unexpected exceptions become sanitized protocol/internal errors and are logged with the correlation ID.

### Resources

Use the `learnerverse://` URI scheme and owner-check every dynamic read:

- `learnerverse://docs/getting-started`
- `learnerverse://docs/workflow`
- `learnerverse://schemas/course-build-spec/v1`
- `learnerverse://examples/course-build-spec/minimal`
- `learnerverse://capabilities`
- `learnerverse://projects/{project_id}`
- `learnerverse://projects/{project_id}/spec/current`
- `learnerverse://jobs/{job_id}`
- `learnerverse://jobs/{job_id}/events{?cursor}`
- `learnerverse://assets/{asset_id}/metadata`
- `learnerverse://artifacts/{artifact_id}/metadata`
- `learnerverse://artifacts/{artifact_id}/qa-report`

Binary media should normally be represented by short-lived signed HTTPS URLs plus checksum/MIME/size metadata, not placed inline in MCP JSON. Small text artifacts such as manifests, schemas, caption snippets, and QA reports may be returned directly.

### Prompts and server instructions

Register:

- `build_course`: guides an agent from spec inspection through validation, asset upload/resolution, dry-run estimate, submission, polling, review, and publish confirmation.
- `repair_failed_build`: consumes job/resource context and proposes the smallest safe retry or spec revision.
- `revise_lesson`: revises one lesson while preserving stable IDs and unaffected cached artifacts.

Server instructions must explicitly state:

1. Call `get_capabilities` first unless already known and fresh.
2. Read the v1 schema resource before creating or editing a spec.
3. Validate before mutating.
4. For local files, call the upload flow; never place local paths in a remote build spec.
5. Reuse matching ready assets before generating new ones when the user allows reuse.
6. Show the user validation warnings, estimated duration, and estimated maximum cost before an expensive build when not already pre-approved in the spec.
7. Submit with a stable idempotency key.
8. Poll `get_job` using `retry_after_ms`; do not busy-loop.
9. On retryable errors, use the stated recovery action; do not recreate the project.
10. Never publish or delete without explicit user approval.
11. Never ask for or transmit provider keys through a prompt/tool argument; direct the user to Settings.

## 7. Ten phases, delivered two at a time

## Batch A — Phases 1 + 2: Contracts and durable foundations

### Phase 1 — Canonical contracts, domain boundary, and compatibility policy

Goal: remove ambiguity before MCP or rendering code is introduced.

Implementation tasks:

- Add `CourseBuildSpec` v1 and all nested strict Pydantic schemas under `backend/app/production/schemas/v1/`.
- Export committed JSON Schema and examples under `schemas/course-build/v1/` at repository root.
- Add a pure `ProductionSpecService.validate()` that returns the validation envelope and estimates without database mutation.
- Add a normalized compiler input model separate from the submitted spec.
- Add stable error codes and JSON Pointer paths.
- Add deterministic canonical JSON serialization/checksum.
- Add `schema_version`, `compiler_version`, `template_version`, and explicit migration interfaces.
- Refactor existing course import to accept a typed `LearnerVerseCourseExportV1` rather than raw `dict`, without breaking its v1 export format.
- Define transport-neutral service interfaces. REST and MCP adapters will call these interfaces.
- Write Architecture Decision Records for MCP v2, Remotion worker, durable queue, private media storage, and the Tasks-extension fallback.

Tests:

- Unit/property tests for valid and invalid specs, duplicate IDs, dangling asset refs, count/size limits, cost limits, and deterministic checksum.
- Golden schema tests so Pydantic changes cannot silently break clients.
- Migration round-trip tests and current course export/import regression tests.

Exit criteria:

- A fixture spec deterministically validates and compiles to a typed normalized plan.
- Invalid inputs return exact field paths and suggested fixes.
- No production service accepts untyped arbitrary payloads.

### Phase 2 — Production records, durable jobs, idempotency, and shared limits

Goal: builds survive restarts and are safe for agent retries.

Implementation tasks:

- Add Alembic migrations for production projects/specs/runs, jobs/events/attempts, idempotency records, usage ledger, and initial indexes/constraints.
- Replace startup-created task tables with migrated models. Migrate existing organize/playlist task behavior onto the same job abstraction or deprecate the old tables after data expiry.
- Introduce Redis plus a maintained durable Python job system selected in an ADR (for example Dramatiq or Celery); configure API and worker services separately.
- Implement transactional enqueue using an outbox row so DB commit and queue dispatch cannot diverge.
- Implement leases, heartbeat, retries with backoff/jitter, max attempts, dead-letter state, cooperative cancel, checkpoints, and worker shutdown behavior.
- Use full-entropy IDs and bind every query to `user_id` and resource ownership.
- Implement idempotency keys scoped by user + operation; reject key reuse with a different request checksum.
- Replace process-local rate limits for protected/expensive operations with Redis-backed token buckets and concurrency quotas.
- Add correlation IDs propagated through API, queue, worker, storage, provider calls, and events.
- Publish internal `JobService.submit/get/cancel/retry/result` interfaces.

Tests:

- Kill API and worker processes mid-stage and prove recovery.
- Duplicate submit race, lease expiry, stale worker completion, cancellation, retry, dead-letter, and cross-user access tests.
- Multi-worker rate-limit and idempotency tests.

Exit criteria:

- A synthetic multi-stage job completes after API/worker restarts exactly once from the caller's perspective.
- No background production work uses `asyncio.create_task`.
- All task/job access is owner-bound.

Batch A deliverable: contracts and reliable execution only; no MCP endpoint yet. This intentionally eliminates G-03, G-09 through G-13, G-27, and the foundation of G-26/G-29.

## Batch B — Phases 3 + 4: Assets and deterministic media compilation

### Phase 3 — Secure asset catalog, uploads, BYOK providers, provenance, and budgets

Goal: turn “new/reusable assets” into explicit, secure, reproducible inputs.

Implementation tasks:

- Add asset/version/binding/provider-credential/usage models and migrations.
- Extend storage behind an `ObjectStore` interface with private buckets, presigned multipart upload/download, checksums, range reads, retention, and deletion. Store object keys, not permanent public URLs.
- Add upload intents with expected size, MIME, SHA-256, expiry, owner, and allowed asset kind.
- Stream large files; never buffer entire videos in API memory.
- Verify magic bytes and use ffprobe/ImageMagick-equivalent metadata extraction in an isolated worker.
- Add antivirus/malware scanning and quarantine state.
- Build outbound URL protections: HTTPS-only by default, DNS resolution and re-resolution checks, block loopback/link-local/private/cloud-metadata ranges, bounded redirects/time/size, MIME allowlists, and isolated fetch worker.
- Add reusable asset search/deduplication by checksum, tags, semantic text, media type, aspect ratio, duration, and license.
- Add provider interfaces for AI text, TTS, generated images, and optional music/SFX. Provider calls must use per-user credentials when configured, otherwise permitted platform credentials.
- Encrypt per-user provider secrets using envelope encryption/KMS; expose create/test/delete and masked metadata only. Never log, return, export, or elicit a secret.
- Record prompt/model/provider/version/seed where available, source URI, license assertion, consent, generation timestamp, checksum, and parent lineage.
- Estimate and reserve a cost budget before generation; stop before exceeding the user's approved maximum.

Tests:

- Multipart resume, bad checksum, MIME spoof, zip bomb/oversize, duplicate upload, quarantine, signed URL expiry, and storage deletion tests.
- SSRF test corpus including redirects, IPv6, DNS rebinding simulation, localhost, link-local, and metadata endpoints.
- Secret redaction and encryption/key-rotation tests.
- Provider contract tests with fakes; no paid provider in default CI.

Exit criteria:

- A local asset can be safely uploaded, scanned, versioned, found, bound, and downloaded by an authorized render worker.
- A reusable asset remains immutable and traceable.
- A generated asset has provenance and budget usage.

### Phase 4 — Scene compiler, narration/captions, Remotion templates, and preview

Goal: deterministically turn a validated spec and resolved assets into a renderable manifest.

Implementation tasks:

- Define `RenderManifestV1` in Pydantic and TypeScript from one committed JSON Schema.
- Implement a deterministic scene compiler: lesson scripts -> narration segments -> timed scenes -> tracks -> transitions -> captions -> manifest.
- Add scene types initially limited to a reliable set: title, text, image, image-with-callouts, code, quote, bullet list, quiz prompt, section divider, and outro.
- Add narration provider abstraction, pronunciation overrides, SSML-safe handling, voice metadata, and cached audio by normalized text + voice + provider version.
- Generate WebVTT/SRT captions from narration timing; enforce readable line length, timing, and locale.
- Create the `render-worker` service with Remotion, pinned Chromium, FFmpeg, ffprobe, bundled fonts, and deterministic template packages.
- Keep template code versioned and independent from arbitrary input. The spec may select approved template IDs; it may not submit executable React/JS, shell commands, filters, or file paths.
- Implement low-resolution/watermarked scene and lesson previews before full render.
- Cache compilation/render stages by immutable input checksums.
- Use safe areas, WCAG-minded contrast, minimum text size, and reduced-motion/template rules.

Tests:

- Python/TypeScript manifest schema compatibility test.
- Deterministic compiler and cache-key fixtures.
- Screenshot tests for each scene type and aspect ratio.
- Audio/caption alignment and Unicode/font fallback fixtures.
- Render sandbox escape tests: malformed text, path traversal, hostile SVG/HTML, huge dimensions, and invalid codecs.

Exit criteria:

- A one-lesson fixture generates narration, captions, manifest, preview frames, and a short playable preview without manual steps.
- Identical immutable inputs produce the same manifest checksum and reuse cached stages.

Batch B deliverable: the application can securely ingest/resolve assets and compile a deterministic media preview. This resolves G-04 through G-08, G-17, G-21 through G-24, and part of G-30.

## Batch C — Phases 5 + 6: MCP/auth foundation and full render/publish pipeline

### Phase 5 — Latest MCP server core, authorization, scopes, and personal access tokens

Goal: expose secure, conformant MCP foundations before exposing production mutations.

Implementation tasks:

- Pin official `mcp` Python SDK v2 and create `backend/app/mcp/server.py` using `MCPServer`.
- Mount `mcp.streamable_http_app()` at `/mcp` in FastAPI. Compose the MCP session manager into the existing lifespan correctly.
- Create `backend/app/mcp/stdio.py` for local IDE clients. Keep stdout protocol-clean; all logs go to stderr.
- Implement server name/version/instructions, `get_capabilities`, read-only documentation/schema/example resources, and a health/conformance smoke test.
- Configure Streamable HTTP transport security with exact allowed hosts/origins, reverse-proxy handling, body/time limits, TLS at ingress, and correct MCP/CORS headers.
- Integrate Auth0 (or another standards-capable authorization server) with MCP OAuth 2.1: RFC 9728 Protected Resource Metadata, RFC 8414/OIDC discovery, PKCE, Client ID Metadata Documents where supported, audience/resource validation, issuer validation, and short-lived tokens.
- Define scopes: `mcp:read`, `course:write`, `asset:read`, `asset:write`, `render:submit`, `render:read`, `render:cancel`, `course:publish`, `token:manage`, `credential:manage`. Enforce scopes in services as well as adapters.
- Return correct `401`/`403` and scoped `WWW-Authenticate` challenges. Never accept tokens in query parameters.
- Add personal MCP access tokens in Settings as fallback for self-hosted/non-OAuth clients: generate 256-bit random secret, prefix for identification, Argon2id/HMAC-backed stored verifier, scopes, expiration, copy-once display, last-used audit, rotate/revoke. Do not call PAT auth “OAuth compliant.”
- In single-user mode, bind MCP HTTP to loopback by default. Refuse non-loopback startup unless an explicit secure override and authentication are configured.
- Add middleware for per-principal rate limits, audit events, redaction, correlation, protocol-version metrics, and OpenTelemetry.

Tests:

- MCP `server/discover`, tools/list, resources/list/read, schema, cache-hint, cancellation, stdio framing, and Streamable HTTP tests using the official Python `Client` in memory and over HTTP.
- Latest revision plus one supported legacy revision compatibility matrix.
- OAuth metadata, PKCE, issuer/audience/resource, expired token, wrong scope, PAT revoke/expiry, cross-user, Host/Origin, DNS rebinding, and CORS tests.
- Verify no secrets or authorization headers appear in logs/traces/errors.

Exit criteria:

- VS Code/another reference MCP client can connect over stdio and HTTP, discover only authorized capabilities, and read documentation/schema resources.
- Unauthorized or wrong-scope calls fail correctly and safely.

### Phase 6 — Complete render, QA, course assembly, and publish services

Goal: make the non-MCP production workflow complete and reliable before an agent drives it.

Implementation tasks:

- Implement staged handlers: validate -> persist spec -> resolve assets -> generate missing assets -> narrate -> compile -> render previews -> render final -> QA -> assemble course -> await review -> publish.
- Render one artifact per lesson and an optional concatenated course video; store MP4 H.264/AAC baseline outputs initially, plus captions, thumbnails, manifest, and QA report.
- Isolate render workers with CPU/memory/disk/time/process/network limits. Render containers receive only signed inputs and scoped output credentials.
- Implement QA gates with ffprobe/FFmpeg and visual/audio analyzers: file readability, expected duration tolerance, dimensions/fps/codecs, missing streams, black/frozen frames, silence/clipping/loudness, caption presence/timing, missing assets, text overflow/safe areas, and checksum.
- Make QA failures stage-specific and repairable. A failed lesson does not force unrelated successful lessons to rerender.
- Add `video_asset_id`, `captions_asset_id`, provenance, and duration to the lesson domain via migration. Preserve YouTube lessons for backward compatibility; add a generated/uploaded video source type rather than overloading `youtube_url`.
- Assemble course/sections/lessons through existing domain services in one idempotent publishing transaction. Keep production project state separate from learner-facing ready state.
- Require human review when requested by policy. Build completion must not automatically mean public publication.
- Generate signed playback/download URLs through an authorized endpoint.
- Record storage, render seconds, provider units, and actual cost.

Tests:

- Golden one-lesson and multi-section builds using tiny checked-in/generated fixtures.
- Worker restart, individual lesson retry, cancel during render, partial cache reuse, budget exhaustion, disk full, provider timeout, and storage outage tests.
- Validate resulting MP4 with ffprobe, decode sample frames, parse captions, and verify lesson attachment/course readiness.
- Regression tests proving existing YouTube courses still work.

Exit criteria:

- A REST/service-level E2E fixture produces a complete playable private course, passes QA, supports review, and publishes exactly once.
- Every output can be traced to spec, assets, providers, compiler, renderer, and checksums.

Batch C deliverable: a secure latest-version MCP foundation and a complete non-MCP production engine. This resolves G-01/G-02/G-14 through G-16/G-18/G-25 and most of G-26.

## Batch D — Phases 7 + 8: Agent workflow and product settings/IDE onboarding

### Phase 7 — Agent-grade MCP tools, resources, prompts, upload bridge, and Tasks adapter

Goal: let an IDE agent safely execute the entire workflow from one high-level request.

Implementation tasks:

- Register the primary tools/resources/prompts defined in Section 6 with strict types, titles, descriptions, annotations, and structured outputs.
- Make `build_course_from_spec` orchestration-aware but transport-thin: it validates, persists an immutable spec, reserves budget, and submits a durable run.
- Add granular repair/review/publish tools while keeping the default surface small.
- Add dry-run and confirmation semantics for expensive/publish/delete tools.
- Return `retry_after_ms`, percent/stage, latest safe event cursor, cost, warnings, and `next_actions` from job calls.
- Publish job/resource change notifications through `subscriptions/listen` when supported; preserve polling correctness.
- Implement a local stdio upload bridge. It may read only explicit allowed roots configured by the user, validates canonical paths/no symlink escape, and uploads bytes through the same asset service. The remote HTTP server never receives or opens a local path.
- Add `TasksAdapter` with `supported=false` by default. Enable the `io.modelcontextprotocol/tasks` path only after SDK support/conformance; normal job tools remain permanent fallback.
- Add capability-based behavior for input-required approval/choices. Never require client elicitation support for the core workflow; return a clear paused state and next action when unavailable.
- Add prompt fixtures showing exactly how an agent uses new, reusable, and mixed assets.

Required golden agent sequence:

```text
get_capabilities
-> read schema/workflow resources
-> validate_course_spec
-> search_assets for reusable refs
-> create_asset_upload + complete_asset_upload for local refs
-> validate_course_spec again if bindings changed
-> build_course_from_spec(dry_run=false, idempotency_key=...)
-> get_job until ready_for_review/completed, respecting retry_after_ms
-> read QA/resource result
-> review_build(approve)
-> publish_course(confirm=true) only after explicit user approval
-> get_job_result
```

Tests:

- In-memory and transport-level tool contract tests, structured output schema validation, pagination, cache hints, cancellation, notifications, and agent retry/idempotency.
- Simulated client capability matrix: latest client, legacy client, no elicitation, no subscription, Tasks unsupported, and Tasks supported when adapter is enabled.
- Local bridge path traversal/symlink/allowed-root tests.
- Prompt-driven evaluation: an agent receives only the user request + server surface and must complete the golden workflow without hidden instructions.

Exit criteria:

- A reference agent can build the golden course with no REST knowledge and no manual database/storage action.
- Duplicate or resumed agent turns do not duplicate assets, jobs, courses, or charges.

### Phase 8 — Settings UX, API key/token management, and “How to use MCP” guide

Goal: make the capability usable without editing backend environment files or guessing IDE configuration.

Implementation tasks:

- Add a Settings “MCP & Integrations” section with:
  - MCP server URL and health/status.
  - OAuth connect/reconnect status.
  - “Create personal MCP token” with name, scopes, expiration, copy-once display, masked token list, last used, rotate, and revoke.
  - Provider credentials (OpenRouter, TTS, image generation): add/test/replace/delete, masked only, with clear data/cost disclosure.
  - Default render settings, default budget, review-before-publish, retention, and allowed local roots guidance.
  - Ready-to-copy IDE configuration examples without embedding secrets.
- Add authenticated REST endpoints/hooks/components for token and credential management. Re-authenticate or require recent login for sensitive changes.
- Add `docs/MCP-guide.md` and link it from Settings and the MCP getting-started resource.
- Provide a checked-in `.vscode/mcp.json.example`, never a real `.vscode/mcp.json` containing a token.
- In VS Code examples, use `inputs`/prompted secrets or environment files, as VS Code recommends. Include both:
  - remote Streamable HTTP URL with OAuth (preferred),
  - local stdio command with explicit workspace/asset roots.
- Document other clients generically and link their current official config docs instead of assuming identical JSON shapes.
- Include troubleshooting: server discovery, trust prompt, OAuth redirect, 401/403 scope, 421 host rejection, stdout corruption, unavailable tools, upload/root denial, worker offline, job failed, and log locations.
- Add a “Test MCP connection” UI action that performs non-mutating discovery and capability checks only.

Example VS Code shape to finalize against the current VS Code schema during implementation:

```json
{
  "servers": {
    "learnerverse": {
      "type": "http",
      "url": "https://YOUR_HOST/mcp"
    }
  }
}
```

Example self-hosted/local stdio shape:

```json
{
  "servers": {
    "learnerverse-local": {
      "type": "stdio",
      "command": "uv",
      "args": [
        "--directory",
        "${workspaceFolder}/backend",
        "run",
        "python",
        "-m",
        "app.mcp.stdio"
      ],
      "env": {
        "LEARNERVERSE_ALLOWED_ROOTS": "${workspaceFolder}"
      }
    }
  }
}
```

The final guide must state that MCP access tokens and provider API keys are different:

- MCP token: authorizes the IDE to call LearnerVerse. Prefer OAuth remotely.
- Provider key: authorizes LearnerVerse to purchase/use AI/TTS/image services. It stays encrypted server-side and is never placed in IDE MCP JSON.

Tests:

- Frontend component and accessibility tests for token copy-once/revoke, provider key masking/test/delete, configuration copy, and error states.
- Playwright flow from Settings -> token/OAuth setup -> client test -> revocation.
- Secret scanning on repository and built frontend assets.

Exit criteria:

- A new user can configure the server in VS Code from the guide, connect, run a safe test, and revoke access without backend shell access.
- No secret appears in source control, browser storage, analytics, logs, or MCP resources.

Batch D deliverable: the IDE agent can perform the complete workflow, and the user has a safe settings/onboarding experience. This resolves G-06, G-19, G-20, and completes G-16/G-17.

## Batch E — Phases 9 + 10: Full E2E proof, operations, rollout, and long-term compatibility

### Phase 9 — MCP conformance, security, media, and true end-to-end testing

Goal: prove the system, not merely demonstrate it.

Implementation tasks:

- Add CI jobs for:
  - backend unit/integration tests,
  - official SDK in-memory and Streamable HTTP MCP tests,
  - stdio protocol tests,
  - latest + legacy protocol matrix,
  - OAuth/PAT and scope security tests,
  - render-worker lint/type/unit tests,
  - containerized short render and FFmpeg QA,
  - frontend tests,
  - full golden agent E2E.
- Add a docker-compose E2E stack: PostgreSQL, Redis, object store emulator/MinIO, backend, job worker, render worker, and test client.
- Create tiny license-safe deterministic fixtures for images, audio, fonts, and scripts. Keep the golden render short enough for CI.
- Use the official Python MCP `Client` for protocol tests and at least one real IDE smoke checklist before release.
- Add security tests for prompt/tool injection boundaries, auth confusion, token passthrough, owner isolation, SSRF, path traversal, malicious media, resource exhaustion, ID enumeration, overbroad scopes, replay, idempotency conflicts, and signed URL leakage.
- Add load/soak tests for concurrent polling, uploads, queue claims, and renders; define capacity limits and graceful 429/503 behavior.
- Add observability dashboards/alerts: queue depth/age, stage latency/failure, render duration, worker heartbeat, provider errors, storage growth, cost, auth failures, protocol versions, and E2E synthetic success.
- Make CI fail on lint errors; remove the current frontend lint `continue-on-error` before release.

Golden E2E acceptance test:

1. Start a clean stack and create two users.
2. Configure fake/local providers and authenticate MCP client A.
3. Discover server and validate a multi-section fixture spec.
4. Upload one local asset, reuse one catalog asset, and generate one fake-provider asset.
5. Dry-run and verify duration/cost estimate.
6. Submit twice with the same idempotency key; assert one run and one charge reservation.
7. Restart API and one worker during execution; assert recovery.
8. Poll via MCP until review, verify events/progress and no busy loop.
9. Verify MP4 decode, streams, captions, thumbnails, checksums, QA report, and lesson attachments.
10. Approve and publish; verify the ready course in REST and frontend learner view.
11. Attempt access/cancel/read as user B; assert denial without data leakage.
12. Revoke the MCP token and assert the next call is unauthorized.

Exit criteria:

- Golden E2E is green in CI and a production-like staging environment.
- Security and load thresholds are documented and enforced.
- A failed stage is diagnosable through correlation ID without exposing secrets.

### Phase 10 — Production hardening, migration, documentation, and release gates

Goal: ship safely and keep the integration maintainable.

Implementation tasks:

- Feature flags: `MCP_ENABLED`, `MCP_HTTP_ENABLED`, `MCP_STDIO_ENABLED`, `PRODUCTION_PIPELINE_ENABLED`, `GENERATED_ASSETS_ENABLED`, and `MCP_TASKS_EXTENSION_ENABLED`.
- Roll out in order: developer-only stdio -> staging HTTP read-only -> staging mutation/render -> selected users -> general availability.
- Backfill existing lessons with explicit source type (`youtube`) without changing behavior.
- Define SLOs: MCP availability/latency, job start latency, render success, job recovery, and publish correctness.
- Define quotas and plan limits: concurrent jobs, input/output duration, assets, storage, provider spend, token count, and retention.
- Add backup/restore drills for DB and object metadata; document what is reproducible versus retained.
- Add artifact lifecycle jobs: abandoned upload cleanup, expired preview cleanup, soft-delete retention, legal hold, user export/delete, and reference-counted reusable asset deletion.
- Publish operator runbooks for worker outage, queue backlog, provider outage, storage outage, compromised token/key, runaway spend, bad template release, rollback, and task recovery.
- Add MCP tool/schema semantic-versioning policy. Add new optional fields compatibly; never repurpose names; keep deprecated tools for a documented window with replacement metadata.
- Schedule quarterly dependency/spec/security review. At each MCP revision or SDK major update, rerun the full protocol/client matrix before changing the advertised version.
- If the Python SDK gains stable Tasks-extension support, enable it in staging behind `TasksAdapter`, run the opt-in/fallback matrix, then roll out without removing job tools.
- Update root README, architecture diagrams, environment samples, Docker Compose, deployment workflows, privacy/terms, and `docs/MCP-guide.md`.

Release gates:

- No open blocker/critical security findings.
- Golden E2E green repeatedly, including restart/retry run.
- OAuth metadata validated by at least two compatible clients; PAT path clearly labeled fallback.
- Restore and rollback drills completed.
- Cost caps and kill switch tested.
- Existing YouTube/LMS regression suite green.
- Settings and MCP guide reviewed from a clean-machine setup.

Exit criteria:

- A user can start with only the guide, their script JSON, and authorized new/reusable assets and finish with a published, playable LearnerVerse course from an MCP-enabled IDE.
- Operations can revoke, pause, recover, audit, and upgrade the system without corrupting user projects.

Batch E deliverable: production readiness, not merely feature completion. This resolves G-26/G-28 through G-30 and validates every earlier gap closure.

## 8. Batch dependency and completion rules

| Batch | Must start after | Demo at batch end | Merge gate |
|---|---|---|---|
| A: 1+2 | None | Validate a spec; durable synthetic job survives restart | Contract, migration, job recovery, isolation tests green |
| B: 3+4 | A | Upload/reuse/generate fixtures and render a lesson preview | Asset security and deterministic manifest/render tests green |
| C: 5+6 | A; B for Phase 6 | Connect MCP read-only; complete a private course through services | Auth/conformance plus full render/QA/publish service E2E green |
| D: 7+8 | C | Build from an IDE agent and configure/revoke access in Settings | Golden agent evaluation and settings Playwright flow green |
| E: 9+10 | D | Clean-stack, restart-resilient, cross-user-isolated full course | All release gates green |

Rules for the coding agent:

- Implement and merge one two-phase batch at a time. Do not begin the next batch while the current exit criteria fail.
- Each batch includes code, migrations, tests, docs, config samples, and rollback notes.
- Preserve existing user changes and YouTube course behavior.
- Do not put new startup DDL in `main.py`; all persistent schema changes use Alembic.
- Do not expose ORM models directly as MCP schemas.
- Do not place domain logic inside MCP decorators.
- Do not use a synchronous, minutes-long MCP tool call for rendering.
- Do not add hidden automatic publication.
- Do not store raw API tokens/keys or permanent public media URLs.
- Do not claim Tasks-extension support until negotiated conformance tests pass.

## 9. Recommended implementation ticket breakdown

Each item should be independently reviewable and include tests.

1. `PROD-001`: CourseBuildSpec v1 schemas, JSON Schema, examples, validation envelope.
2. `PROD-002`: Domain errors, canonical checksum, estimates, schema migration interface.
3. `JOB-001`: Production/job/event/idempotency migrations and repositories.
4. `JOB-002`: Redis queue, outbox dispatcher, leases, heartbeats, retry/cancel/recovery.
5. `ASSET-001`: Private object-store interface and multipart upload intents.
6. `ASSET-002`: scanning, metadata, SSRF-safe remote ingestion, reusable catalog.
7. `CRED-001`: encrypted per-user provider credentials and usage budgets.
8. `MEDIA-001`: RenderManifestV1 and deterministic scene compiler.
9. `MEDIA-002`: narration/caption pipeline and provider caching.
10. `MEDIA-003`: Remotion/FFmpeg worker, templates, preview, sandbox.
11. `MCP-001`: SDK v2 server, stdio, mounted Streamable HTTP, lifespan, discovery/resources.
12. `AUTH-001`: MCP OAuth metadata/scopes/token validation and transport security.
13. `AUTH-002`: Personal MCP tokens and Settings APIs.
14. `PROD-003`: staged full build handlers, QA, generated-video lesson source, publish transaction.
15. `MCP-002`: primary tools and shared structured result/error envelope.
16. `MCP-003`: resources, prompts, instructions, notifications, local upload bridge.
17. `MCP-004`: capability-gated Tasks adapter and fallback matrix.
18. `UI-001`: Settings MCP/provider credential UX and connection test.
19. `DOC-001`: MCP guide and IDE configuration examples.
20. `TEST-001`: containerized golden E2E, conformance/security/load matrix.
21. `OPS-001`: observability, quotas, retention, runbooks, feature flags, rollout.

## 10. Final acceptance checklist

### Protocol and agent behavior

- [ ] Latest MCP `2026-07-28` is the primary tested revision.
- [ ] Official Python SDK v2 is pinned; no copied v1 `FastMCP` implementation.
- [ ] `server/discover`, tools, resources, prompts, pagination/cache behavior, cancellation, stdio, and Streamable HTTP pass tests.
- [ ] Server instructions alone are sufficient for a reference agent to select the correct workflow.
- [ ] Tool inputs/outputs are strict, versioned, structured, and actionable.
- [ ] Polling fallback always works; Tasks extension is opt-in and capability-gated.

### End-to-end production

- [ ] Script JSON validates with field-level errors and cost/duration estimate.
- [ ] Uploaded, reusable, and generated assets all work with provenance.
- [ ] Narration, captions, manifests, previews, final MP4, thumbnails, and QA report are produced.
- [ ] Jobs survive restarts, retry safely, cancel cooperatively, and remain idempotent.
- [ ] Generated videos attach to the correct course lessons.
- [ ] Review and publish are separate, explicit operations.
- [ ] Existing YouTube courses continue to work.

### Security and settings

- [ ] Remote MCP uses OAuth 2.1 discovery/PKCE/audience/resource/scopes.
- [ ] Personal MCP tokens are scoped, expiring, hashed, copy-once, auditable, and revocable.
- [ ] Provider keys are encrypted, masked, testable, deletable, and never sent through MCP elicitation.
- [ ] Assets/artifacts are private and delivered with short-lived signed URLs.
- [ ] Owner isolation, SSRF, path traversal, malicious media, token replay/passthrough, rate limits, and quotas are tested.
- [ ] Single-user MCP cannot accidentally listen publicly without secure explicit configuration.

### Quality and operations

- [ ] Golden full E2E runs in CI and staging.
- [ ] Media is decoded and inspected, not merely checked for file existence.
- [ ] Metrics, traces, safe logs, audit events, alerts, and cost ledger are present.
- [ ] Backup/restore, retention/deletion, provider outage, queue recovery, and rollback runbooks are tested.
- [ ] `docs/MCP-guide.md` and Settings onboarding work from a clean environment.

## 11. Final product-level success scenario

From the IDE, the user says:

> Build this complete course from `course-script.json`. Reuse the logo and intro animation already in my LearnerVerse assets, upload the diagrams from `./course-assets`, generate any missing illustrations, render all lesson videos, run quality checks, and stop for my approval before publishing.

The agent discovers LearnerVerse, reads the workflow/schema, validates the script, resolves reusable assets, explicitly uploads allowed local files through the stdio bridge or upload intents, reports estimate/warnings, submits one idempotent durable build, monitors it without busy-waiting, repairs only retryable failures, presents the QA/artifact results, and waits. After the user approves, it publishes exactly once. The finished course appears in LearnerVerse with playable generated lesson videos, captions, quizzes, provenance, and complete audit history.

That scenario—not merely seeing tools in an MCP inspector—is the final definition of done.
