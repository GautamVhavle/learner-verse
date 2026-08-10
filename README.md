<div align="center">

<img src="frontend/public/logo.svg" alt="LearnerVerse" width="80" />

# LearnerVerse

**Turn any YouTube playlist into a structured, AI-powered learning experience.**

Quizzes . Progress Tracking . Certificates . AI Study Companion

[![Live](https://img.shields.io/badge/Live-learnerverse.xyz-blue?style=for-the-badge&logo=vercel&logoColor=white)](https://learnerverse.xyz)
&nbsp;
[![License](https://img.shields.io/badge/License-BSL_1.1-orange?style=for-the-badge)](LICENSE)
&nbsp;
[![GitHub Stars](https://img.shields.io/github/stars/GautamVhavle/learner-verse?style=for-the-badge&logo=github&color=yellow)](https://github.com/GautamVhavle/learner-verse/stargazers)

[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Tailwind](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev)
[![CI](https://img.shields.io/github/actions/workflow/status/GautamVhavle/learner-verse/test.yml?branch=main&style=flat-square&label=CI)](https://github.com/GautamVhavle/learner-verse/actions)

<br />

[**Try it Live**](https://learnerverse.xyz) &middot; [**Report a Bug**](https://github.com/GautamVhavle/learner-verse/issues/new?template=bug_report.yml) &middot; [**Request a Feature**](https://github.com/GautamVhavle/learner-verse/issues/new?template=feature_request.yml) &middot; [**Discussions**](https://github.com/GautamVhavle/learner-verse/discussions)

</div>

---

## What is LearnerVerse?

Paste a YouTube video or playlist URL and LearnerVerse uses AI to organize it into a structured course with sections, generates quizzes, tracks your progress with streaks, awards verifiable certificates, and gives you **LiVi** -- an inline AI tutor that answers questions about any lesson.

Whether you are a self-learner turning playlists into study plans or a creator sharing knowledge with the world, LearnerVerse handles the structure so you can focus on learning.

### Key Features

<table>
  <tr>
    <td>🎯 <strong>One-Click Import</strong><br/>Paste any YouTube URL, get a structured course instantly</td>
    <td>🧠 <strong>AI Quizzes</strong><br/>Auto-generated questions after every lesson</td>
    <td>💬 <strong>LiVi AI Tutor</strong><br/>Ask questions about any lesson in real time</td>
  </tr>
  <tr>
    <td>📊 <strong>Progress & Streaks</strong><br/>Track completion, build learning streaks</td>
    <td>📜 <strong>Certificates</strong><br/>Earn and share verifiable completion certificates</td>
    <td>🌐 <strong>Course Hub</strong><br/>Discover and share community-created courses</td>
  </tr>
  <tr>
    <td>⏱️ <strong>Focus Timer</strong><br/>Built-in Pomodoro timer for study sessions</td>
    <td>🔐 <strong>Auth0 Integration</strong><br/>Secure JWT-based authentication</td>
    <td>📝 <strong>Study Notes</strong><br/>Take timestamped notes while learning</td>
  </tr>
</table>

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Tailwind CSS v4, Vite 8, TanStack Query, Zustand, GSAP, Motion |
| **Backend** | FastAPI, SQLAlchemy (async), Alembic, Pydantic v2 |
| **Database** | PostgreSQL (Supabase in prod, any Postgres locally) |
| **Auth** | Auth0 (JWT RS256) or `SINGLE_USER_MODE` for local dev |
| **AI** | OpenRouter (primary) + Gemini fallback when rate-limited |
| **Deployment** | Vercel (frontend), FastAPI Cloud (backend), Docker (self-host) |
| **CI/CD** | GitHub Actions (lint, test, type-check, deploy) |

---

## Project Structure

```
learner-verse/
├── backend/                    # FastAPI application
│   ├── app/
│   │   ├── api/v1/endpoints/   # Route handlers
│   │   ├── core/               # Config, database, security
│   │   ├── models/             # SQLAlchemy ORM models
│   │   ├── repositories/       # Data access layer
│   │   ├── schemas/            # Pydantic request/response schemas
│   │   └── services/           # Business logic layer
│   ├── alembic/                # Database migrations
│   ├── tests/                  # Pytest test suite
│   ├── Dockerfile
│   └── pyproject.toml
├── frontend/                   # React SPA
│   ├── src/
│   │   ├── components/         # UI components (shadcn/ui based)
│   │   ├── hooks/              # React Query hooks, custom hooks
│   │   ├── pages/              # Route page components
│   │   ├── stores/             # Zustand state stores
│   │   ├── lib/                # Utilities, API client, auth
│   │   └── types/              # TypeScript type definitions
│   ├── public/                 # Static assets, PWA manifest
│   ├── tests/                  # Vitest + Playwright tests
│   ├── Dockerfile
│   └── package.json
├── .github/                    # CI/CD workflows, issue templates
├── scripts/                    # Setup and deployment scripts
├── docker-compose.yml          # Full-stack Docker setup
├── Makefile                    # Developer workflow commands
└── LICENSE                     # BSL-1.1 (free for personal use)
```

---

## Getting Started

### Prerequisites

- **Python 3.12+** with [uv](https://docs.astral.sh/uv/)
- **Node.js 20+** with npm
- **PostgreSQL** (local, Docker, or hosted)

### 1. Clone and configure

```bash
git clone https://github.com/GautamVhavle/learner-verse.git
cd learner-verse
make setup   # copies sample.env files
```

Edit `.env` and `frontend/.env` with your settings.

> **Tip:** Set `SINGLE_USER_MODE=true` and `VITE_SINGLE_USER_MODE=true` to skip Auth0 setup entirely during local development. Set `GEMINI_API_KEY` for automatic fallback when OpenRouter is rate-limited.

### 2. Backend

```bash
cd backend
uv sync                           # install dependencies
uv run alembic upgrade head       # run migrations
uv run uvicorn app.main:app --reload --port 8000
```

API docs available at `http://localhost:8000/docs`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                       # starts on http://localhost:5173
```

### Docker (alternative)

```bash
docker compose up --build         # backend :8000, frontend :3000
```

### Single-User Mode (Self-Hosted)

For one trusted person. No Auth0 is required, but there is no login boundary, so this mode is not suitable for a school or an untrusted network.

**Setup:**

```bash
./scripts/self-host.sh setup single
# Optionally add OPENROUTER_API_KEY or GEMINI_API_KEY to .env.single-user
./scripts/self-host.sh up single
```

Then open **http://localhost:3000** - you're automatically logged in as `local@learnerverse.dev` with feature gates unlocked.

**Features in Single-User Mode:**
- ✅ Courses, quizzes, progress, certificates, goals, discussions, and local uploads
- ✅ AI tutor and AI generation when an AI provider key is configured
- ✅ Local file storage (no Supabase)
- ✅ No authentication (always logged in)
- ✅ PostgreSQL database (data persisted in Docker volumes)
- ✅ Runs on any machine with Docker

To stop without deleting data: `./scripts/self-host.sh down single`

### Multi-User Mode (Self-Hosted)

For schools, classrooms, or communities. Uses Auth0 for authentication so users have isolated progress, notes, and certificates. Payment gating is disabled, so all authenticated users receive the complete supported LMS feature set.

**Prerequisites:**
- A free [Auth0](https://auth0.com) account
- Add `http://localhost:3000` to your Auth0 app's allowed callback URLs and origins

**Setup:**

```bash
./scripts/self-host.sh setup multi
# Fill in Auth0, the public school URL, an admin email, and optional AI keys
nano .env.multi-user
./scripts/self-host.sh check multi
./scripts/self-host.sh up multi
```

Then open **http://localhost:3000** - users can sign up and log in via Auth0.

**Features in Multi-User Mode:**
- ✅ All Pro features enabled (AI tutor, unlimited quizzes, certificates)
- ✅ Auth0 authentication (email/password, social logins)
- ✅ Each user gets their own progress, notes, and certificates
- ✅ Course Hub for sharing courses between users
- ✅ Local file storage (no Supabase)
- ✅ PostgreSQL database (data persisted in Docker volumes)

For HTTPS, backups, upgrades, feature dependencies, verification, and troubleshooting, follow the **[complete self-hosting guide](docs/self-hosting.md)**.

To stop without deleting data: `./scripts/self-host.sh down multi`

---

## Available Commands

| Command | Description |
|---------|-------------|
| `make setup` | Copy sample.env files for first-time setup |
| `make dev-backend` | Run backend with hot reload |
| `make dev-frontend` | Run frontend dev server |
| `make dev-db` | Start PostgreSQL via Docker |
| `make docker` | Build and start everything with Docker Compose |
| `make migrate` | Run Alembic migrations |
| `make migration msg="..."` | Create a new migration |
| `make test` | Run all tests (backend + frontend) |
| `make test-backend` | Run pytest |
| `make test-frontend` | Run vitest |
| `make test-e2e` | Run Playwright end-to-end tests |
| `make lint` | Ruff + ESLint |
| `make format` | Ruff format + Prettier |

---

## Environment Variables

<details>
<summary><strong>Backend</strong> (<code>.env</code>)</summary>

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (`postgresql+asyncpg://...`) |
| `SECRET_KEY` | Yes | Random 64-character string for JWT signing |
| `SINGLE_USER_MODE` | No | `true` to bypass auth (local dev). Default: `false` |
| `AUTH0_DOMAIN` | Prod | Auth0 tenant domain |
| `AUTH0_AUDIENCE` | Prod | Auth0 API identifier |
| `OPENROUTER_API_KEY` | For AI | OpenRouter API key for quiz gen and LiVi |
| `OPENROUTER_MODEL` | No | Model name (default: free Nemotron) |
| `GEMINI_API_KEY` | No | Gemini fallback key (auto-fallback on 429) |
| `CORS_ORIGINS` | Yes | Comma-separated allowed origins |
| `FRONTEND_URL` | Prod | Public frontend URL for OG tags and redirects |
| `SENTRY_DSN` | No | Sentry error tracking DSN |
| `PAYMENT_GATEWAY_ENABLED` | No | `true` to enable payment features. Default: `false` |

</details>

<details>
<summary><strong>Frontend</strong> (<code>frontend/.env</code>)</summary>

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE_URL` | Yes | Backend API URL (`http://localhost:8000/api/v1`) |
| `VITE_SINGLE_USER_MODE` | No | `true` to bypass auth. Default: `false` |
| `VITE_AUTH0_DOMAIN` | Prod | Auth0 tenant domain |
| `VITE_AUTH0_CLIENT_ID` | Prod | Auth0 SPA client ID |
| `VITE_AUTH0_AUDIENCE` | Prod | Auth0 API identifier |
| `VITE_PUBLIC_SITE_URL` | Prod | Public site URL for share links |
| `VITE_PAYMENT_GATEWAY_ENABLED` | No | `true` to show payment UI. Default: `false` |

</details>

---

## Deployment

### Production

| Target | Method |
|--------|--------|
| **Frontend** | Vercel: `cd frontend && vercel --prod` |
| **Backend** | FastAPI Cloud: `cd backend && uv run fastapi cloud deploy` |
| **Full Stack** | Docker: `docker compose up --build -d` |

CI/CD is configured via GitHub Actions. Pushing to `main` triggers:
1. Lint, type-check, and test validation
2. Automatic deployment to Vercel (frontend) and FastAPI Cloud (backend)

See [`.github/workflows/`](.github/workflows/) for the pipeline configuration.

### Self-Hosting

Use multi-user mode for a school. It provides Auth0 login and isolated accounts while keeping the database and backend private inside the Docker network. Single-user mode has no login boundary and is only for one trusted person or a tightly controlled private network.

| Mode | Intended use | Authentication | Payment UI |
|------|--------------|----------------|------------|
| **Multi-user** | Schools and teams | Auth0 | Hidden |
| **Single-user** | One trusted operator | None | Hidden |

```bash
git clone https://github.com/GautamVhavle/learner-verse.git
cd learner-verse
./scripts/self-host.sh setup multi
# Configure the Auth0 and public-hostname values in .env.multi-user
./scripts/self-host.sh check multi
./scripts/self-host.sh up multi
```

The application is served from one public origin (port `3000` by default); `/api`, `/uploads`, and `/mcp` are routed internally. PostgreSQL and the backend API are not published as host ports. AI features require an OpenRouter or Gemini key, and email delivery is not currently implemented.

See the [complete school self-hosting guide](docs/self-hosting.md) for TLS, Auth0 callback URLs, backups, upgrades, health checks, and the feature dependency matrix.

---

## Contributing

We welcome contributions from everyone! Please read our [Contributing Guide](CONTRIBUTING.md) before submitting a pull request.

**Quick overview:**

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Make your changes and add tests
4. Run checks: `make lint && make test`
5. Commit using [Conventional Commits](https://conventionalcommits.org): `feat:`, `fix:`, `docs:`, `chore:`
6. Open a Pull Request

### Code Style

| Area | Tooling |
|------|---------|
| Backend | [Ruff](https://docs.astral.sh/ruff/) (lint + format), 100-char line length, Python 3.12+ |
| Frontend | ESLint + Prettier, TypeScript strict mode |
| Commits | [Conventional Commits](https://conventionalcommits.org) |

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

---

## Community

- [GitHub Discussions](https://github.com/GautamVhavle/learner-verse/discussions) -- Ask questions, share ideas
- [Issue Tracker](https://github.com/GautamVhavle/learner-verse/issues) -- Report bugs, request features
- [Security Policy](SECURITY.md) -- Report vulnerabilities responsibly

---

## License

LearnerVerse is licensed under the [Business Source License 1.1](LICENSE) (BSL-1.1).

**What this means:**

- **Personal and educational use**: Free and unrestricted
- **Self-hosting for your own use**: Allowed
- **Commercial use** (selling, SaaS, managed service): Not permitted without written permission
- **After 4 years**: Automatically converts to the MIT License

See the full [LICENSE](LICENSE) file for details.

---

<div align="center">

<a href="https://learnerverse.xyz"><img src="frontend/public/logo.svg" alt="LearnerVerse" width="40" /></a>

**[learnerverse.xyz](https://learnerverse.xyz)**

Built with care for curious minds.

[Report a Bug](https://github.com/GautamVhavle/learner-verse/issues/new?template=bug_report.yml) &middot; [Request a Feature](https://github.com/GautamVhavle/learner-verse/issues/new?template=feature_request.yml) &middot; [Discussions](https://github.com/GautamVhavle/learner-verse/discussions)

<sub>If you found this useful, consider giving it a star.</sub>

</div>
