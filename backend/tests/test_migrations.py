"""Fresh-install migration smoke tests."""

import os
import subprocess
import sys
from pathlib import Path

from sqlalchemy import create_engine, inspect


def test_alembic_upgrade_head_on_fresh_sqlite_database(tmp_path: Path):
    """Every migration must remain portable to the supported SQLite setup."""
    backend_root = Path(__file__).resolve().parents[1]
    database_path = tmp_path / "migration-test.db"
    environment = os.environ.copy()
    environment["DATABASE_URL"] = f"sqlite+aiosqlite:///{database_path}"
    environment["SECRET_KEY"] = "migration-test-secret"

    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=backend_root,
        env=environment,
        capture_output=True,
        text=True,
        timeout=60,
        check=False,
    )

    assert result.returncode == 0, result.stdout + result.stderr

    engine = create_engine(f"sqlite:///{database_path}")
    try:
        constraints = inspect(engine).get_unique_constraints("certificates")
    finally:
        engine.dispose()
    assert any(
        constraint["name"] == "uq_certificate_user_course"
        and constraint["column_names"] == ["user_id", "course_id"]
        for constraint in constraints
    )

    pragma_check = subprocess.run(
        [
            sys.executable,
            "-c",
            (
                "import asyncio\n"
                "from sqlalchemy import text\n"
                "from app.core.database import engine\n"
                "async def check():\n"
                "    async with engine.connect() as connection:\n"
                "        enabled = await connection.scalar(text('PRAGMA foreign_keys'))\n"
                "        assert enabled == 1, enabled\n"
                "    await engine.dispose()\n"
                "asyncio.run(check())"
            ),
        ],
        cwd=backend_root,
        env=environment,
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )
    assert pragma_check.returncode == 0, pragma_check.stdout + pragma_check.stderr
