"""Async SQLAlchemy engine and session factory.

Provides ``get_db`` — a FastAPI dependency that yields an ``AsyncSession``
scoped to a single request lifetime.
"""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import settings

# Use NullPool — no connections are held open between requests.
# This is the correct (and Supabase-recommended) approach when the app
# connects through PgBouncer in Session mode. PgBouncer itself is the
# pool; a second pool inside SQLAlchemy only causes "max clients reached"
# errors. The connection from the app to PgBouncer is lightweight (no TLS
# to PG itself), so per-request open/close has negligible overhead.
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    poolclass=NullPool,
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
