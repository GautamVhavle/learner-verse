# Production operations and release gates

## Rollout

1. Enable local stdio only. 2. Enable staging HTTP read-only. 3. Enable staging mutations and renderer. 4. Enable selected users. 5. General availability after golden E2E and rollback drills pass.

Feature flags are `MCP_ENABLED`, `MCP_HTTP_ENABLED`, `MCP_STDIO_ENABLED`, `PRODUCTION_PIPELINE_ENABLED`, `GENERATED_ASSETS_ENABLED`, and `MCP_TASKS_EXTENSION_ENABLED`. Tasks stays off until the SDK publishes conformant support.

The hosted MCP endpoint is `https://learner-verse.fastapicloud.dev/mcp/` on the
same FastAPI Cloud service as the REST API. Do not expose a second MCP port.
FastAPI Cloud web deployment does not by itself run this repository's Redis,
outbox, jobs, and rendering services, so the production pipeline flag must stay
off until those services are separately deployed and observed as healthy.

## SLOs and alerts

Alert on MCP availability below 99.9%, p95 discovery latency above 1 second, queue age above 60 seconds, render failures above 2%, worker heartbeat loss, provider/storage errors, budget reservation failures, and abnormal token authentication failures.

## Incident runbooks

- Worker/queue outage: pause submissions, retain durable runs, restore Redis/worker, then recover expired leases.
- Provider/storage outage: disable generated assets or pipeline, preserve specs/assets, retry only failed stage.
- Compromised token/key: revoke token, rotate encryption/signing key, audit last-used time and affected runs.
- Runaway spend: set pipeline flag false, cancel queued jobs, reconcile reservations.
- Bad template: disable renderer, pin last template, rerun QA before release.

## Recovery and retention

Back up PostgreSQL plus private object metadata together. Restoring DB without referenced objects is not reproducible. The scheduled lifecycle worker expires abandoned upload intents and purges soft-deleted assets after configured retention. Test restore/rollback in staging quarterly.

## Compatibility

Tool and schema names are semver contracts: only add optional fields compatibly; never repurpose a name. Keep deprecated tools for a documented migration window. Review MCP protocol, SDK, dependencies, and security quarterly; rerun current and legacy client tests before changing the advertised revision.
