# Contributing to LearnerVerse

Thank you for your interest in contributing to LearnerVerse! This guide will help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Code Style](#code-style)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold this code.

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/learner-verse.git
   cd learner-verse
   ```
3. **Add the upstream remote:**
   ```bash
   git remote add upstream https://github.com/GautamVhavle/learner-verse.git
   ```
4. **Set up the development environment:**
   ```bash
   make setup
   ```

## Development Setup

### Prerequisites

- Python 3.12+ with [uv](https://docs.astral.sh/uv/)
- Node.js 20+ with npm
- PostgreSQL (local or Docker)

### Backend

```bash
cd backend
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Environment

Set `SINGLE_USER_MODE=true` and `VITE_SINGLE_USER_MODE=true` in your env files to skip Auth0 setup during development. See the [README](README.md#environment-variables) for all available variables.

## Making Changes

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feat/your-feature
   ```
2. **Make focused changes.** Keep pull requests small and scoped to a single concern.
3. **Write tests** for new functionality.
4. **Run checks** before committing:
   ```bash
   make lint && make test
   ```
5. **Commit** with a descriptive message following [Conventional Commits](https://conventionalcommits.org):
   ```
   feat: add course export functionality
   fix: correct enrollment count on hub page
   docs: update deployment instructions
   chore: upgrade TanStack Query to v5.62
   ```

### Branch Naming

Use descriptive prefixes:
- `feat/` -- New features
- `fix/` -- Bug fixes
- `docs/` -- Documentation changes
- `chore/` -- Maintenance, dependencies, tooling
- `refactor/` -- Code restructuring without behavior changes

## Code Style

### Backend (Python)

- **Formatter/Linter:** [Ruff](https://docs.astral.sh/ruff/)
- **Line length:** 100 characters
- **Target:** Python 3.12+
- **Rules:** E, W, F, I (isort), B (bugbear), UP (pyupgrade)
- **Run:** `cd backend && uv run ruff check . && uv run ruff format .`

### Frontend (TypeScript)

- **Linter:** ESLint with TypeScript support
- **Formatter:** Prettier
- **Framework:** React 19 with hooks, no class components
- **State:** TanStack Query for server state, Zustand for client state
- **Styling:** Tailwind CSS v4 utility classes
- **Run:** `cd frontend && npm run lint && npx prettier --check src/`

### General Guidelines

- Prefer simple, readable code over clever abstractions
- Use TypeScript strict mode; avoid `any`
- Keep components small and focused
- Use existing patterns from the codebase as reference
- Do not add dependencies without discussion

## Testing

### Backend

```bash
cd backend
uv run pytest tests/ -v              # all tests
uv run pytest tests/api/ -v          # API tests only
uv run pytest tests/services/ -v     # service tests only
```

Tests use SQLite in-memory by default. The test suite includes a safety check to prevent accidental connection to production databases.

### Frontend

```bash
cd frontend
npm run test                         # unit tests (vitest)
npm run test -- --run                # single run
npx playwright test                  # e2e tests
```

### Running Everything

```bash
make test                            # backend + frontend
make test-e2e                        # playwright
```

## Pull Request Process

1. **Ensure CI passes.** All lint, type-check, and test steps must be green.
2. **Write a clear PR description** explaining what changed and why.
3. **Link related issues** using `Closes #123` in the PR body.
4. **Keep the diff small.** Large PRs are harder to review and more likely to have issues.
5. **Respond to review feedback** promptly.
6. **Squash commits** if your PR has many small fixup commits.

### What We Look For

- Code follows existing patterns and style
- New features have tests
- No unnecessary dependencies added
- Documentation updated if needed (README, env vars, etc.)
- No hardcoded secrets or credentials
- No breaking changes without discussion

## Issue Guidelines

### Bug Reports

Use the [bug report template](https://github.com/GautamVhavle/learner-verse/issues/new?template=bug_report.yml) and include:
- Steps to reproduce
- Expected vs actual behavior
- Browser/OS/environment details
- Screenshots or error logs if applicable

### Feature Requests

Use the [feature request template](https://github.com/GautamVhavle/learner-verse/issues/new?template=feature_request.yml) and include:
- Clear description of the feature
- Use case and motivation
- Any alternative approaches considered

### Good First Issues

Look for issues labeled [`good first issue`](https://github.com/GautamVhavle/learner-verse/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) if you are new to the project.

---

Thank you for helping make LearnerVerse better!
