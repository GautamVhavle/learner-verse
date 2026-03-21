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

# NullPool ensures each connection is fresh — avoids "another operation in progress"
test_engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    poolclass=NullPool,
    connect_args={
        "statement_cache_size": 0,
        "server_settings": {"search_path": "public"},
    },
)
TestSessionLocal = async_sessionmaker(
    test_engine, class_=AsyncSession, expire_on_commit=False
)


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
        for table in reversed(Base.metadata.sorted_tables):
            await conn.execute(text(f'TRUNCATE TABLE "{table.name}" CASCADE'))
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
