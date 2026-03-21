"""Async SQLAlchemy engine and session factory.

Provides ``get_db`` — a FastAPI dependency that yields an ``AsyncSession``
scoped to a single request lifetime.
"""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_pre_ping=False,
    pool_recycle=280,
    pool_size=5,
    max_overflow=10,
    connect_args={
        "statement_cache_size": 0,
        "server_settings": {"search_path": "public"},
    },
)

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncSession:
    """FastAPI dependency — yields a database session and closes it afterward."""
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()
