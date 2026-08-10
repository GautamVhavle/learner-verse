.PHONY: dev-db dev-backend dev-frontend test test-backend test-frontend test-e2e lint lint-backend lint-frontend format migrate setup setup-payment undo-payment docker

# === Setup ===
setup:
	./scripts/setup.sh

# === Database ===
dev-db:
	docker compose up -d db

stop-db:
	docker compose down

# === Docker ===
docker:
	docker compose up --build

# === Backend ===
dev-backend:
	cd backend && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# === Frontend ===
dev-frontend:
	cd frontend && npm run dev

# === Migrations ===
migrate:
	cd backend && uv run alembic upgrade head

migration:
	cd backend && uv run alembic revision --autogenerate -m "$(msg)"

# === Testing ===
test: test-backend test-frontend

test-backend:
	cd backend && DATABASE_URL=sqlite+aiosqlite:///test.db SECRET_KEY=test-secret-key-12345678901234567890123456789012 OPENROUTER_API_KEY=test-key ENVIRONMENT=test uv run pytest -v

test-frontend:
	cd frontend && npx vitest run

test-e2e:
	cd frontend && npx playwright test

# === Linting ===
lint: lint-backend lint-frontend

lint-backend:
	cd backend && uv run ruff check .

lint-frontend:
	cd frontend && npx eslint .

# === Formatting ===
format:
	cd backend && uv run ruff format .
	cd frontend && npx prettier --write "src/**/*.{ts,tsx,css,json}"

# === Payment Gateway (Private Submodule) ===
setup-payment:
	./scripts/setup-payment.sh

undo-payment:
	./scripts/setup-payment.sh --undo
