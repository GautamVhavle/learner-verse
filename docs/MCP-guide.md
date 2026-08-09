# LearnerVerse MCP guide

LearnerVerse lets an IDE agent validate a versioned course JSON, build a private course, inspect its job, and publish only after explicit approval.

## VS Code

The production MCP endpoint is served by the same FastAPI Cloud application as
the REST API. It is `https://learner-verse.fastapicloud.dev/mcp/`; there is no
separate production port 8001.

Remote MCP with a LearnerVerse personal token:

```json
{
  "servers": {
    "learnerverse": {
      "type": "http",
      "url": "https://learner-verse.fastapicloud.dev/mcp/",
      "headers": {
        "Authorization": "Bearer ${env:LEARNERVERSE_MCP_TOKEN}"
      }
    }
  }
}
```

Keep the token in the IDE environment/keychain, not in a committed JSON file.
Generate and revoke tokens from **Use MCP** in LearnerVerse.

For local development, configure an explicit asset root:

```json
{"servers":{"learnerverse-local":{"type":"stdio","command":"uv","args":["--directory","${workspaceFolder}/backend","run","python","-m","app.mcp.stdio"],"env":{"LEARNERVERSE_ALLOWED_ROOTS":"${workspaceFolder}"}}}
```

Read the workflow and schema resources, validate the spec, run a dry run, then submit a build with an idempotency key. Poll `get_job` at its suggested interval. Publish only after the user explicitly asks you to.

## Credentials

An MCP token authorizes an IDE to call LearnerVerse. A provider key authorizes LearnerVerse to use an AI, narration, or image provider. They are different: provider keys stay encrypted server-side and must never be pasted into MCP configuration or chat.

## Troubleshooting

- `401` / `403`: reconnect OAuth or create a token with the needed scope.
- `421`: the requested Host is not in the server transport allowlist.
- No tools: accept the IDE trust prompt and re-run discovery.
- Stdio errors: keep stdout protocol-clean; inspect stderr/server logs only.
- Upload/root denied: select an explicit allowed root; remote HTTP never reads IDE paths.
- Worker offline or job failed: read job events, correct the input, then retry with a new idempotency key.

## Production configuration

FastAPI Cloud must have `MCP_PUBLIC_URL=https://learner-verse.fastapicloud.dev/mcp/`,
`MCP_ISSUER_URL=https://learner-verse.fastapicloud.dev/`, and
`MCP_ALLOWED_HOSTS=learner-verse.fastapicloud.dev`. Vercel must build with
`VITE_API_BASE_URL=https://learner-verse.fastapicloud.dev/api/v1`, while backend
CORS must include `https://learnerverse.xyz`.

Keep `PRODUCTION_PIPELINE_ENABLED=false` on a web-only deployment. Set it to
`true` only when the Redis queue, outbox dispatcher, database worker, isolated
renderer, private storage, and their health monitoring are deployed. Discovery,
token management and validation remain available while mutation is disabled.
