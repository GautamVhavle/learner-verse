<div align="center">

<img src="frontend/public/logo.svg" alt="LearnerVerse" width="80" />

# LearnerVerse

**Turn any YouTube playlist into a structured, AI-powered learning experience.**

Quizzes · Progress Tracking · Certificates · AI Study Companion

[![Live](https://img.shields.io/badge/🌐_Live-learnerverse.xyz-blue?style=for-the-badge)](https://learnerverse.xyz)
&nbsp;
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Tailwind](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev)

<br />

[**Live Demo**](https://learnerverse.xyz) · [**Report Bug**](https://github.com/GautamVhavle/learner-verse/issues) · [**Request Feature**](https://github.com/GautamVhavle/learner-verse/issues)

</div>

<br />

---

<br />

## ✦ About

Paste a YouTube video or playlist URL → LearnerVerse uses AI to organize it into a structured course with sections, generates quizzes, tracks your progress with streaks, awards verifiable certificates, and gives you **LiVi** — an inline AI tutor that answers questions about any lesson.

### ✨ Key Features

<table>
  <tr>
    <td>🎯 <strong>One-Click Import</strong><br/>Paste any YouTube URL, get a structured course instantly</td>
    <td>🧠 <strong>AI Quizzes</strong><br/>Auto-generated questions after every lesson</td>
    <td>💬 <strong>LiVi AI Tutor</strong><br/>Ask questions about any lesson in real time</td>
  </tr>
  <tr>
    <td>📊 <strong>Progress & Streaks</strong><br/>Track completion, build learning streaks</td>
    <td>📜 <strong>Certificates</strong><br/>Earn & share verifiable completion certificates</td>
    <td>🌐 <strong>Course Hub</strong><br/>Discover and share community-created courses</td>
  </tr>
  <tr>
    <td>⏱️ <strong>Focus Timer</strong><br/>Built-in Pomodoro timer for study sessions</td>
    <td>🔐 <strong>Auth0 Integration</strong><br/>Secure JWT-based authentication</td>
    <td>📝 <strong>Study Notes</strong><br/>Take timestamped notes while learning</td>
  </tr>
</table>

<br />

## ✦ Tech Stack

| Layer | Stack |
|-------|-------|
| **Frontend** | React 19, TypeScript, Tailwind CSS v4, Vite, TanStack Query, GSAP, Motion |
| **Backend** | FastAPI, SQLAlchemy (async), Alembic, PostgreSQL |
| **Auth** | Auth0 (JWT RS256) — toggle `SINGLE_USER_MODE=true` for local dev |
| **AI** | OpenRouter API (quiz generation, course organization, LiVi chat) |
| **Database** | Supabase PostgreSQL (prod) / any Postgres locally |
| **Deployment** | Vercel (frontend) · FastAPI Cloud (backend) |

<br />

## ✦ Getting Started

### Prerequisites

- **Python 3.12+** with [uv](https://docs.astral.sh/uv/)
- **Node.js 20+** with npm
- **PostgreSQL** (local or Docker)

### 1. Clone & configure

```bash
git clone https://github.com/GautamVhavle/learner-verse.git
cd learner-verse
```

Copy and fill in the env files:

```bash
cp backend/sample.env .env        # root .env used by docker-compose & backend
cp frontend/sample.env frontend/.env
```

> [!TIP]
> Set `SINGLE_USER_MODE=true` and `VITE_SINGLE_USER_MODE=true` to skip Auth0 setup entirely during local development.

### 2. Backend

```bash
cd backend
uv sync                           # install dependencies
uv run alembic upgrade head       # run migrations
uv run uvicorn app.main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                       # starts on http://localhost:5173
```

### 🐳 Docker (alternative)

```bash
docker compose up --build         # backend :8000, frontend :3000
```

<br />

## ✦ Available Commands

| Command | Description |
|---------|-------------|
| `make dev-backend` | Run backend with hot reload |
| `make dev-frontend` | Run frontend dev server |
| `make migrate` | Run alembic migrations |
| `make migration msg="..."` | Create new migration |
| `make test` | Run all tests |
| `make test-backend` | Run pytest |
| `make test-frontend` | Run vitest |
| `make test-e2e` | Run playwright |
| `make lint` | Ruff + ESLint |
| `make format` | Ruff format + Prettier |

<br />

## ✦ Environment Variables

<details>
<summary>🔧 <strong>Backend</strong> (<code>.env</code>)</summary>

<br />

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (asyncpg) |
| `SECRET_KEY` | Yes | Random 64-char string |
| `SINGLE_USER_MODE` | No | `true` to bypass auth (local dev) |
| `AUTH0_AUDIENCE` | Prod | Auth0 API identifier |
| `OPENROUTER_API_KEY` | For AI | OpenRouter API key |
| `SENTRY_DSN` | Prod | Sentry error tracking |
| `CORS_ORIGINS` | Yes | Comma-separated allowed origins |

</details>

<details>
<summary>🔧 <strong>Frontend</strong> (<code>frontend/.env</code>)</summary>

<br />

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE_URL` | Yes | Backend API URL |
| `VITE_SINGLE_USER_MODE` | No | `true` to bypass auth |
| `VITE_AUTH0_DOMAIN` | Prod | Auth0 domain |
| `VITE_AUTH0_CLIENT_ID` | Prod | Auth0 client ID |
| `VITE_AUTH0_AUDIENCE` | Prod | Auth0 API identifier |

</details>

<br />

## ✦ Deployment

| Target | Command |
|--------|---------|
| **Frontend** (Vercel) | `cd frontend && vercel --prod` |
| **Backend** (FastAPI Cloud) | `cd backend && uv run fastapi deploy --app-id <YOUR_APP_ID>` |

> The backend uses `[tool.fastapi] entrypoint = "app.main:app"` in `pyproject.toml`.

<br />

## ✦ Contributing

Contributions are welcome! Here's how:

1. **Fork** the repo
2. **Branch** — `git checkout -b feat/your-feature`
3. **Code** — make your changes
4. **Check** — `make lint && make test`
5. **Commit** — use [Conventional Commits](https://conventionalcommits.org) (`feat:`, `fix:`, `docs:`)
6. **PR** — open a Pull Request

### Code Style

| Area | Tooling |
|------|---------|
| Backend | Ruff (lint + format), 100-char line length |
| Frontend | ESLint + Prettier, TypeScript strict mode |
| Commits | Conventional Commits (`feat:`, `fix:`, `chore:`) |

<br />

## ✦ License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.

<br />

---

<div align="center">

<br />

<a href="https://learnerverse.xyz"><img src="frontend/public/logo.svg" alt="LearnerVerse" width="40" /></a>

**[learnerverse.xyz](https://learnerverse.xyz)**

Built with ♥ for curious minds.

[Report Bug](https://github.com/GautamVhavle/learner-verse/issues) · [Request Feature](https://github.com/GautamVhavle/learner-verse/issues) · [Discussions](https://github.com/GautamVhavle/learner-verse/discussions)

<sub>If you found this useful, consider giving it a ⭐</sub>

<br />

</div>