"""FastAPI application entry point.

Creates the ASGI application, wires up CORS middleware, includes
the versioned API router, and provides a lifespan hook that ensures
the default user and Supabase storage bucket exist on startup.
"""

import logging
import time
import traceback
from contextlib import asynccontextmanager

import sentry_sdk
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select

from app.api.dependencies import SINGLE_USER_ID
from app.api.v1.router import api_v1_router
from app.core.config import settings
from app.core.database import async_session_maker
from app.core.storage import ensure_bucket
from app.models.user import User

# ── Sentry error tracking ─────────────────────────────────────────────────────
# Initialised unconditionally; when SENTRY_DSN is empty the SDK is a no-op.
# Add SENTRY_DSN=https://...@sentry.io/... to your production environment.
sentry_sdk.init(
    dsn=settings.SENTRY_DSN or None,
    environment=settings.SENTRY_ENVIRONMENT,
    # Capture 10 % of transactions for performance monitoring.
    traces_sample_rate=0.1,
    # Don't send PII (user IPs, emails) to Sentry by default.
    send_default_pii=False,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan hook: ensures the default user and storage bucket exist."""
    _validate_config()

    if settings.SINGLE_USER_MODE:
        await _ensure_default_user()

    # Ensure the organize_tasks table exists (shared across workers).
    await _ensure_organize_tasks_table()

    # Create the Supabase Storage bucket if missing.
    try:
        await ensure_bucket()
    except Exception as exc:
        logging.getLogger(__name__).warning(
            "Supabase Storage unavailable at startup - thumbnail uploads will fail.\nReason: %s",
            exc,
        )
    yield


async def _ensure_default_user() -> None:
    """Auto-create the local development user if it doesn't exist yet."""
    async with async_session_maker() as session:
        result = await session.execute(select(User).where(User.id == SINGLE_USER_ID))
        if result.scalar_one_or_none() is None:
            user = User(
                id=SINGLE_USER_ID,
                email="local@learnerverse.dev",
                display_name="Local User",
            )
            session.add(user)
            await session.commit()


async def _ensure_organize_tasks_table() -> None:
    """Create the organize_tasks table if it doesn't exist.

    Uses raw DDL so we don't need a migration - the table is a simple
    ephemeral store shared across workers.
    """
    from sqlalchemy import text

    async with async_session_maker() as session:
        await session.execute(
            text("""
            CREATE TABLE IF NOT EXISTS organize_tasks (
                id VARCHAR(16) PRIMARY KEY,
                course_id UUID NOT NULL,
                status VARCHAR(10) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'done', 'failed')),
                error TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)
        )
        # Ensure index on course_id for lookup performance
        await session.execute(
            text("""
            CREATE INDEX IF NOT EXISTS idx_organize_tasks_course_id
                ON organize_tasks (course_id)
        """)
        )
        # Clean up old tasks (>10 min)
        await session.execute(
            text("DELETE FROM organize_tasks WHERE created_at < NOW() - INTERVAL '10 minutes'")
        )
        await session.commit()


def _validate_config() -> None:
    """Fail fast on misconfiguration before the first request is served."""
    _logger = logging.getLogger(__name__)

    if not settings.SINGLE_USER_MODE and not settings.AUTH0_AUDIENCE:
        # An empty audience means PyJWT skips the ``aud`` claim check,
        # allowing tokens issued for *any* Auth0 client to authenticate.
        _logger.error(
            "AUTH0_AUDIENCE is not set in multi-user mode. "
            "Any valid Auth0 token can authenticate against this API. "
            "Set AUTH0_AUDIENCE to your API identifier in your environment."
        )
        raise RuntimeError(
            "AUTH0_AUDIENCE must be set when SINGLE_USER_MODE=false. "
            "See sample.env for instructions."
        )

    # Warn if SINGLE_USER_MODE is enabled in non-development (5.4 / 2.3)
    if settings.SINGLE_USER_MODE and settings.SENTRY_ENVIRONMENT not in {
        "development",
        "local",
        "",
    }:
        _logger.warning(
            "SINGLE_USER_MODE is enabled in '%s' environment. "
            "All requests are authenticated as the default local user. "
            "Disable SINGLE_USER_MODE for production deployments.",
            settings.SENTRY_ENVIRONMENT,
        )

    # Reject the default SECRET_KEY in multi-user mode (5.4)
    if not settings.SINGLE_USER_MODE and settings.SECRET_KEY == "change-me":
        raise RuntimeError(
            "SECRET_KEY is still set to the default value 'change-me'. "
            'Generate a secure secret: python -c "import secrets; print(secrets.token_urlsafe(32))"'
        )


app = FastAPI(
    title="Learner Verse API",
    description="Personal Learning Management System",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_v1_router)

logger = logging.getLogger(__name__)


@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    """Add security headers to all responses."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response


@app.middleware("http")
async def timing_middleware(request: Request, call_next):
    # Skip for streaming endpoints to avoid BaseHTTPMiddleware buffering
    if "/stream" in request.url.path:
        return await call_next(request)
    start = time.perf_counter()
    response = await call_next(request)
    elapsed = (time.perf_counter() - start) * 1000
    logger.warning("⏱ %s %s → %dms", request.method, request.url.path, elapsed)
    return response


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Catch-all handler so unhandled errors still return CORS headers.

    The full traceback is logged server-side only - exception details are
    never forwarded to the client to avoid leaking internal information.
    """
    logger.error(
        "Unhandled error on %s %s:\n%s", request.method, request.url, traceback.format_exc()
    )
    origin = request.headers.get("origin", "")
    allowed = settings.cors_origins_list
    headers = {}
    if origin and (origin in allowed or "*" in allowed):
        headers["access-control-allow-origin"] = origin
        headers["access-control-allow-credentials"] = "true"
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error."},
        headers=headers,
    )


@app.get("/health")
async def root_health():
    return {"status": "ok"}
