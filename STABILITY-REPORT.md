# LearnerVerse Stability Audit

**Audit date:** 2026-08-10  
**Scope:** FastAPI API and persistence layer, MCP personal-token management, React application, browser workflows, migrations, and self-hosted deployment.

## Executive summary

The audit found and fixed several production-significant defects. The most important were missing authorization checks on learner progress/study operations, SQLite foreign keys being silently disabled, a historical migration dropping certificate idempotency, invalid MCP token state and scope handling, and deployment files that could not represent the application reliably. The codebase now passes the complete backend and frontend automated suites, static checks, fresh-database migration checks, and the principal Playwright course lifecycle flows.

## Fixed findings

### Critical

1. **Private course learning data was addressable by UUID.** Progress, study state, lesson completion, and learner quiz endpoints did not consistently prove that the caller owned or was enrolled in the course. A single `CourseAccessService` now enforces the same policy everywhere: owners may access their non-deleted courses; other users need a public, ready course and an enrollment.
2. **SQLite ignored cascade deletes.** SQLAlchemy connections did not enable `PRAGMA foreign_keys`, so local/single-user deletion could leave orphan lessons, certificates, progress, and enrollments. Every SQLite connection now enables foreign-key enforcement, with an isolated subprocess regression test.
3. **Certificate uniqueness was lost in migration history.** A later quiz migration accidentally removed the `(user_id, course_id)` unique constraint. A forward migration safely deduplicates historical rows and restores database-level idempotency; the ORM model and migration test match it.

### High

4. **MCP token creation accepted invalid state.** Unknown scopes, duplicate scopes, past expirations, excessive lengths, and whitespace-only names could reach storage. Inputs are normalized and validated before mutation.
5. **MCP active-token limits were not enforced.** Token issuance now respects the configured per-user active-token cap and reports a conflict instead of an internal error.
6. **Expired MCP tokens appeared active.** Expiration comparisons now handle SQLite/Postgres timestamp differences and both the API and MCP guide UI expose the correct expired state.
7. **Study state accepted a lesson from another course.** `last_lesson_id` is now checked against the selected course.
8. **Fresh SQLite migrations were not portable.** Historical PostgreSQL-only UUID, JSONB, ARRAY, `now()`, constraint alteration, and update constructs were made dialect-aware. Alembic is now tested from an empty SQLite database through head.
9. **Self-host deployment topology was inconsistent.** Docker images now use reproducible multi-stage builds and a non-root runtime. Compose and nginx consistently proxy `/api`, `/uploads`, `/mcp`, and health endpoints, avoid exposing the database by default, and do not pretend the experimental renderer stack is production-ready.

### Medium and correctness

10. **Direct creator URLs could render learner navigation.** URL mode is now authoritative beneath `/creator` and `/learner`; persisted preference is only a fallback outside those route trees.
11. **Confirmation dialogs generated nested buttons.** Base UI trigger composition now renders the provided trigger directly, restoring valid markup and reliable clicks.
12. **YouTube API loading was race-prone.** The player supports an already-loaded API, safely chains an existing global callback, retries failed script loads, uses collision-free element IDs, and does not retain stale playback-speed state.
13. **UI effects retained stale or unsafe state.** Font-size classes are reset correctly, sidebar updates use functional state, lesson mutations use stable callbacks, and command-palette results are memoized.
14. **Browser tests contained false positives and stale routes.** Tests now use the current creator/learner route structure, wait for completed CRUD dialogs and network mutations without races, reflect current publish/edit rules, use the dedicated profile page, validate certificate download, and avoid ambiguous responsive selectors.
15. **Static dead-test code hid coverage.** Duplicate test function names that caused earlier tests to be overwritten were removed. Unused assignments/imports and stale type suppressions found by Ruff were removed. Repeated course-access logic was consolidated rather than left as divergent branches.

## Deployment and operations improvements

- Added safe `scripts/self-host.sh` and `scripts/self-host-check.sh` entry points.
- Added environment samples with explicit secret placeholders and configurable bindings.
- Added database-aware health checks and MCP-compatible nginx streaming configuration.
- Added `docs/self-hosting.md` with setup, verification, upgrade, backup, and limitations guidance.
- Hardened the backend entrypoint so migrations complete before the API starts.
- The experimental video-render worker remains explicitly out of the supported self-host profile until its runtime and persistence guarantees are production-ready.

## Tests and validation

- Backend: **356 passed**.
- Backend Ruff: all application and test files pass; **207 files formatted**.
- Frontend unit/component tests: **233 passed across 43 files**.
- Frontend ESLint: passed.
- Frontend TypeScript and production Vite build: passed.
- Alembic: empty SQLite database upgrades to head; certificate uniqueness and SQLite FK activation are inspected by tests.
- Playwright: full creator/learner workflows exercised course CRUD, publish transitions, enrollment, all lesson types, quizzes, progress, goals, settings, certificates, sharing, and real PDF download. Assertions discovered during the audit were corrected and rerun on the affected flows.
- Docker Compose: both single-user and multi-user sample configurations render successfully.
- Shell scripts: syntax validation passed.
- Git whitespace/error check: passed.

## Remaining risks and recommended follow-up

These are not release-blocking correctness defects found in this audit, but should remain visible:

1. **External Auth0 journey:** local authorization and multi-user behavior have automated coverage, but a live hosted Auth0 login/logout redirect requires a real test tenant and was not driven end-to-end here.
2. **Frontend bundle size:** certificate PDF rendering remains a large lazy chunk (about 1.56 MB minified) and the main bundle exceeds Vite's advisory threshold. Functionality is correct, including PDF download, but slower devices would benefit from deeper PDF/vendor splitting.
3. **Exact concurrent certificate generation:** the database now guarantees one certificate per learner/course. Two simultaneous first-time requests can still make one request receive a uniqueness error rather than transparently returning the winning row; a retry-on-conflict path would improve ergonomics.
4. **Token-cap concurrency:** the configured MCP token cap uses a count-before-insert check. It is correct for ordinary requests, but a strict cap under simultaneous issuance would require a database lock or serialized quota record.
5. **Renderer pipeline:** the course and MCP content workflows are covered, but the experimental standalone video-render worker is intentionally not claimed as supported by the self-host bundle.

## Production rollout checklist

1. Back up the production database.
2. Deploy the backend and let Alembic apply the new migration before sending traffic to the new application version.
3. Confirm production secrets, CORS origins, public frontend/backend URLs, object storage, Auth0 (multi-user mode), and MCP token encryption keys.
4. Run `/healthz`, the MCP handshake, token create/revoke, one course publish/enroll/complete flow, and certificate download as post-deploy smoke tests.
5. Monitor authorization failures, migration errors, MCP 4xx/5xx rates, and certificate conflict responses during the first deployment window.
