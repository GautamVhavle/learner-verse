"""Async SQLAlchemy engine and session factory.

Provides ``get_db`` - a FastAPI dependency that yields an ``AsyncSession``
scoped to a single request lifetime.
"""

from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import settings

# Use NullPool - no connections are held open between requests.
# This is the correct (and Supabase-recommended) approach when the app
# connects through PgBouncer in Session mode. PgBouncer itself is the
# pool; a second pool inside SQLAlchemy only causes "max clients reached"
# errors. The connection from the app to PgBouncer is lightweight (no TLS
# to PG itself), so per-request open/close has negligible overhead.
_engine_kwargs: dict = dict(
    echo=False,
    poolclass=NullPool,
)

if "sqlite" not in settings.DATABASE_URL:
    _engine_kwargs["connect_args"] = {
        "statement_cache_size": 0,
        "server_settings": {"search_path": "public"},
    }

engine = create_async_engine(settings.DATABASE_URL, **_engine_kwargs)

if "sqlite" in settings.DATABASE_URL:
    # SQLite does not enforce foreign keys unless every connection enables
    # them. Without this, permanent course deletion leaves orphaned lessons,
    # progress, certificates, and other dependent rows behind.
    @event.listens_for(engine.sync_engine, "connect")
    def _enable_sqlite_foreign_keys(dbapi_connection, _connection_record) -> None:
        cursor = dbapi_connection.cursor()
        try:
            cursor.execute("PRAGMA foreign_keys=ON")
        finally:
            cursor.close()


async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncSession:
    """FastAPI dependency - yields a database session and closes it afterward."""
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()
