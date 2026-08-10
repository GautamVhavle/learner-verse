# Self-hosting LearnerVerse

This is the operator guide for a durable LearnerVerse installation. Use **multi-user mode** for a school. Single-user mode has no login boundary and is intended only for one trusted person.

## What the supported stack includes

The Compose deployment runs three services:

- PostgreSQL 17 with a persistent named volume
- the FastAPI backend, including automatic Alembic migrations and persistent local uploads
- the React frontend served by Nginx, which proxies API, upload, share, health, and MCP traffic on the same origin

Payment gating is disabled, so every authenticated self-hosted user can use the complete LMS feature set: course creation and import, lessons and quizzes, progress, notes, goals, discussions, analytics, course sharing, certificates, LiVi, administration, and MCP course-authoring tools.

Some features necessarily need services outside the Compose stack:

| Capability | Additional requirement |
|---|---|
| Multiple user accounts | Auth0 tenant and outbound HTTPS access to it |
| YouTube metadata, playlists, and playback | Outbound HTTPS access to YouTube |
| LiVi and AI quiz generation | OpenRouter or Gemini API key and outbound HTTPS |
| Optional Supabase media storage | Supabase URL and service key; leave both empty for local storage |
| Email delivery | Not implemented in the current application |
| Generated-video production/render pipeline | Experimental and not supported by the self-host Compose stack |

`PRODUCTION_PIPELINE_ENABLED` must remain `false`. The regular LMS does not depend on that experimental pipeline.

Deployment is subject to the BSL 1.1 terms and the repository's Additional Use Grant. Review [LICENSE](../LICENSE) for the intended school deployment.

## School installation

### 1. Prepare the server

Use a current Linux server with Docker Engine and Docker Compose v2. A small pilot should start with at least 2 CPU cores, 4 GB RAM, and enough disk for the database and uploaded thumbnails. Production sizing depends on concurrent users and retained media.

Clone the repository, then create a secure configuration:

```bash
git clone https://github.com/GautamVhavle/learner-verse.git
cd learner-verse
./scripts/self-host.sh setup multi
```

The setup command generates unique database and application secrets. It never overwrites an existing `.env.multi-user`.

### 2. Configure Auth0

Create an Auth0 Single Page Application and an Auth0 API. Use the API identifier as both `AUTH0_AUDIENCE` and `VITE_AUTH0_AUDIENCE`.

For a deployment at `https://learn.school.example`, configure these Auth0 application settings:

- Allowed Callback URLs: `https://learn.school.example`
- Allowed Logout URLs: `https://learn.school.example`
- Allowed Web Origins: `https://learn.school.example`

Edit `.env.multi-user` and set the Auth0 values. The browser client ID belongs in `VITE_AUTH0_CLIENT_ID`. Also set at least one address in `SUPERADMIN_EMAILS` and the same list in `VITE_SUPERADMIN_EMAILS`.

### 3. Configure the public URL

For the same example hostname, update these values:

```dotenv
APP_BIND_ADDRESS=127.0.0.1
APP_PORT=3000
CORS_ORIGINS=https://learn.school.example
FRONTEND_URL=https://learn.school.example
MCP_ALLOWED_HOSTS=learn.school.example
MCP_ALLOWED_ORIGINS=https://learn.school.example
MCP_PUBLIC_URL=https://learn.school.example/mcp/
MCP_ISSUER_URL=https://learn.school.example/
VITE_API_BASE_URL=/api/v1
VITE_PUBLIC_SITE_URL=https://learn.school.example
```

The self-host Compose files pin the browser API to the relative `/api/v1` route. This lets student browsers use the school server hostname instead of incorrectly contacting their own `localhost`; legacy absolute values in an existing env file are ignored.

Set `APP_BIND_ADDRESS=0.0.0.0` only for a trusted LAN-only HTTP deployment. For an internet-reachable installation, bind to `127.0.0.1` and put an HTTPS reverse proxy such as Caddy, Traefik, or Nginx in front of port 3000. TLS termination should add HSTS and redirect HTTP to HTTPS.

### 4. Configure optional features

Set `OPENROUTER_API_KEY`, `GEMINI_API_KEY`, or both to enable LiVi and AI-generated quizzes. If neither is set, the rest of the LMS remains usable and preflight reports a warning.

Leave `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` empty to store uploads in the local Docker volume. If one is set, both must be set.

### 5. Validate and start

```bash
./scripts/self-host.sh check multi
./scripts/self-host.sh up multi
```

The preflight command rejects placeholder secrets, mismatched Auth0 settings, an invalid database hostname, partial Supabase configuration, and accidental activation of the unfinished production pipeline.

Verify the installation:

```bash
curl --fail http://127.0.0.1:3000/healthz
./scripts/self-host.sh status multi
```

The health response must report both `"status":"ok"` and `"database":"connected"`. Then verify login, create a course, upload a thumbnail, add a lesson, complete it as a learner, generate a certificate, and restart the stack once to confirm persistence.

## Operations

### Logs and restart

```bash
./scripts/self-host.sh logs multi
./scripts/self-host.sh restart multi
```

### Backups

Back up both PostgreSQL and local uploads. From the repository directory:

```bash
mkdir -p backups
docker compose --env-file .env.multi-user -f docker-compose.multi-user.yml \
  exec -T db pg_dump -U learnerverse -d learnerverse -Fc > backups/learnerverse.dump
docker compose --env-file .env.multi-user -f docker-compose.multi-user.yml \
  cp backend:/app/uploads backups/uploads
```

Protect backups as sensitive school data and test restoration on a separate server. If Supabase storage is enabled, back up that bucket through the provider as well.

### Updates

Take a backup first, review release notes and configuration changes, then run:

```bash
git pull --ff-only
./scripts/self-host.sh check multi
./scripts/self-host.sh restart multi
```

The backend runs database migrations before it becomes healthy. The frontend waits for that health check, preventing traffic from reaching a partially upgraded application.

### Stop without deleting data

```bash
./scripts/self-host.sh down multi
```

This retains the database and uploads volumes. Do not add `--volumes` unless you intentionally want to permanently delete the installation data.

## Single-user installation

For one trusted user:

```bash
./scripts/self-host.sh setup single
./scripts/self-host.sh check single
./scripts/self-host.sh up single
```

Open `http://localhost:3000`. The default bind address is loopback-only. There is no sign-in screen: every request acts as the same local user, so single-user mode must not be used for a school or exposed to untrusted clients.

## Troubleshooting

- **Preflight reports Auth0 placeholders:** finish the Auth0 setup and copy the real domain, client ID, audience, and issuer into `.env.multi-user`.
- **Login redirects are rejected:** the exact public origin, including `https` and any non-default port, must be present in all three Auth0 allowlists.
- **The UI loads but data does not:** rebuild with `./scripts/self-host.sh restart multi`, open `/healthz`, and inspect `./scripts/self-host.sh logs multi`. The packaged UI always uses the same-origin `/api/v1` proxy.
- **Uploads return HTTP 413:** the supported default is 5 MiB. Keep `MAX_UPLOAD_SIZE_MB` at or below the Nginx limit, or raise both limits deliberately.
- **AI features fail:** verify an API key and outbound DNS/HTTPS access from the backend container.
- **MCP rejects the Host header:** add the exact public hostname to `MCP_ALLOWED_HOSTS`, then restart.
