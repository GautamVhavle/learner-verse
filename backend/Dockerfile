# ── Stage 1: Install dependencies ─────────────────────────
FROM python:3.12-slim AS deps

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Install deps first (cached layer)
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# ── Stage 2: Final image ─────────────────────────────────
FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

ENV PATH="/app/.venv/bin:${PATH}" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Create the unprivileged runtime identity before copying files so ownership
# can be assigned as layers are created instead of recursively rewriting the
# entire virtual environment at the end of every build.
RUN groupadd -r appuser \
    && useradd -r -g appuser -d /app -s /usr/sbin/nologin appuser

# Copy cached venv from deps stage
COPY --from=deps /app/.venv /app/.venv
COPY --from=deps /app/pyproject.toml /app/uv.lock ./

# Copy application code
COPY --chown=appuser:appuser . .

# Writable application data is stored only in mounted volumes.
RUN install -d -o appuser -g appuser /app/uploads /app/production-assets

EXPOSE 8000

# Entrypoint: run migrations then start the server.
COPY --chown=appuser:appuser --chmod=755 entrypoint.sh /app/entrypoint.sh

USER appuser

ENTRYPOINT ["/app/entrypoint.sh"]
