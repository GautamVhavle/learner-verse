"""Serialized Alembic migrations for platforms that run the ASGI app directly."""

from __future__ import annotations

import asyncio
from pathlib import Path

from alembic.config import Config
from sqlalchemy import text

from alembic import command
from app.core.config import settings
from app.core.database import engine

# Stable application-specific lock ID. PostgreSQL advisory locks are scoped to
# one database and connection, so independent deployments cannot migrate the
# same schema concurrently.
_MIGRATION_LOCK_ID = 549_954_401_315_321_159


def _upgrade_to_head() -> None:
    backend_root = Path(__file__).resolve().parents[2]
    config = Config(str(backend_root / "alembic.ini"))
    config.set_main_option("script_location", str(backend_root / "alembic"))
    command.upgrade(config, "head")


async def run_startup_migrations() -> None:
    """Upgrade once before serving requests when the deployment flag is set.

    FastAPI Cloud starts the ASGI application directly and does not execute the
    Docker entrypoint. A session-level advisory lock serializes autoscaled
    instances; each waiting instance then confirms the database is at head.
    """

    if not settings.RUN_MIGRATIONS_ON_STARTUP:
        return

    if settings.DATABASE_URL.startswith("sqlite"):
        await asyncio.to_thread(_upgrade_to_head)
        return

    async with engine.connect() as connection:
        await connection.execute(
            text("SELECT pg_advisory_lock(:lock_id)"), {"lock_id": _MIGRATION_LOCK_ID}
        )
        try:
            await asyncio.to_thread(_upgrade_to_head)
        finally:
            await connection.execute(
                text("SELECT pg_advisory_unlock(:lock_id)"), {"lock_id": _MIGRATION_LOCK_ID}
            )
