import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

# Force single-user mode for tests before importing settings
import os

os.environ["SINGLE_USER_MODE"] = "true"

from app.core.config import settings
from app.core.database import get_db
from app.models.base import Base

# ── Safety check: never run tests against a remote / production database ──
_db_url = settings.DATABASE_URL.lower()
if "supabase" in _db_url or "neon" in _db_url or "amazonaws" in _db_url:
    raise RuntimeError(
        "Refusing to run tests against a remote database!\n"
        "Tests TRUNCATE all tables. Set DATABASE_URL to a local Postgres instance.\n"
        "Example: DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/learnerverse_test"
    )

# NullPool ensures each connection is fresh - avoids "another operation in progress"
_test_engine_kwargs: dict = dict(
    echo=False,
    poolclass=NullPool,
)

if "sqlite" not in settings.DATABASE_URL:
    _test_engine_kwargs["connect_args"] = {
        "statement_cache_size": 0,
        "server_settings": {"search_path": "public"},
    }

test_engine = create_async_engine(settings.DATABASE_URL, **_test_engine_kwargs)
TestSessionLocal = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture(scope="session", autouse=True)
async def _create_tables():
    """Create all tables for SQLite (Postgres uses Alembic migrations)."""
    if "sqlite" in settings.DATABASE_URL:
        async with test_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    async with test_engine.begin() as conn:
        await conn.execute(
            text("""
                CREATE TABLE IF NOT EXISTS organize_tasks (
                    id VARCHAR(16) PRIMARY KEY,
                    course_id UUID NOT NULL,
                    status VARCHAR(10) NOT NULL DEFAULT 'pending',
                    error TEXT,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            """)
        )
        await conn.execute(
            text("""
                CREATE TABLE IF NOT EXISTS playlist_import_tasks (
                    id VARCHAR(16) PRIMARY KEY,
                    section_id UUID NOT NULL,
                    status VARCHAR(10) NOT NULL DEFAULT 'pending',
                    status_message TEXT,
                    playlist_title VARCHAR(500),
                    imported_count INTEGER,
                    error TEXT,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            """)
        )
    yield


async def override_get_db():
    async with TestSessionLocal() as session:
        yield session


def create_test_app():
    """Create a fresh app instance for testing (no lifespan side effects)."""
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware

    from app.api.v1.router import api_v1_router
    from app.core.config import settings

    test_app = FastAPI(title="Learner Verse API Test")
    test_app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    test_app.include_router(api_v1_router)

    @test_app.get("/health")
    async def root_health():
        return {"status": "ok"}

    test_app.dependency_overrides[get_db] = override_get_db
    return test_app


test_app = create_test_app()


@pytest.fixture(autouse=True)
async def clean_tables():
    """Truncate all tables before each test for isolation."""
    async with test_engine.begin() as conn:
        if "sqlite" in settings.DATABASE_URL:
            for table in reversed(Base.metadata.sorted_tables):
                await conn.execute(text(f'DELETE FROM "{table.name}"'))
            await conn.execute(text('DELETE FROM "organize_tasks"'))
            await conn.execute(text('DELETE FROM "playlist_import_tasks"'))
        else:
            for table in reversed(Base.metadata.sorted_tables):
                await conn.execute(text(f'TRUNCATE TABLE "{table.name}" CASCADE'))
            await conn.execute(text('TRUNCATE TABLE "organize_tasks"'))
            await conn.execute(text('TRUNCATE TABLE "playlist_import_tasks"'))
    yield


@pytest.fixture
async def client():
    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
async def db_session():
    async with TestSessionLocal() as session:
        yield session
