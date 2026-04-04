"""Async SQLAlchemy engine and session factory.

Provides ``get_db`` — a FastAPI dependency that yields an ``AsyncSession``
scoped to a single request lifetime.
"""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    # Re-validate each connection before use — prevents hard failures from
    # stale connections recycled after the cloud DB's idle timeout.
    pool_pre_ping=True,
    # Recycle connections after 280 s to stay under typical 300 s cloud timeouts.
    pool_recycle=280,
    # Keep total connections (pool_size + max_overflow) within Supabase's
    # Session-mode pooler limit (typically 15 on free tier, 50+ on paid).
    # 5 persistent + 10 overflow = 15 max, matching the pooler cap.
    pool_size=5,
    max_overflow=10,
    # How long a request waits for a free pool slot before erroring.
    pool_timeout=30,
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
