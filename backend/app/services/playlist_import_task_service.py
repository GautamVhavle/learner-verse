"""Database-backed background task runner for playlist imports.

Uses a lightweight task table so long-running imports survive across
multiple workers without requiring Redis or an external queue.
"""

from __future__ import annotations

import logging
import uuid

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_maker
from app.services.lesson_service import LessonService
from app.services.playlist_service import extract_playlist

logger = logging.getLogger(__name__)


async def create_playlist_import_task(db: AsyncSession, section_id: str) -> str:
    """Insert a new pending playlist import task and return its ID."""
    task_id = uuid.uuid4().hex[:12]
    await db.execute(
        text(
            "INSERT INTO playlist_import_tasks (id, section_id, status, status_message) "
            "VALUES (:id, :sid, 'pending', 'Queued for import') "
            "ON CONFLICT (id) DO NOTHING"
        ),
        {"id": task_id, "sid": section_id},
    )
    await db.commit()
    return task_id


async def get_playlist_import_task_status(
    db: AsyncSession,
    task_id: str,
    section_id: str,
) -> dict | None:
    """Fetch task state for the given section/task combination."""
    row = (
        await db.execute(
            text(
                "SELECT status, error, status_message, playlist_title, imported_count "
                "FROM playlist_import_tasks "
                "WHERE id = :id AND section_id = :sid"
            ),
            {"id": task_id, "sid": section_id},
        )
    ).first()
    if not row:
        return None
    return {
        "status": row[0],
        "error": row[1],
        "status_message": row[2],
        "playlist_title": row[3],
        "imported_count": row[4],
    }


async def _update_playlist_import_task(
    task_id: str,
    *,
    status: str,
    error: str | None = None,
    status_message: str | None = None,
    playlist_title: str | None = None,
    imported_count: int | None = None,
) -> None:
    async with async_session_maker() as db:
        await db.execute(
            text(
                "UPDATE playlist_import_tasks "
                "SET status = :status, "
                "    error = :error, "
                "    status_message = COALESCE(:status_message, status_message), "
                "    playlist_title = COALESCE(:playlist_title, playlist_title), "
                "    imported_count = COALESCE(:imported_count, imported_count) "
                "WHERE id = :id"
            ),
            {
                "id": task_id,
                "status": status,
                "error": error[:500] if error else None,
                "status_message": status_message,
                "playlist_title": playlist_title,
                "imported_count": imported_count,
            },
        )
        await db.commit()


async def run_playlist_import_in_background(
    task_id: str,
    section_id: uuid.UUID,
    user_id: uuid.UUID,
    playlist_url: str,
) -> None:
    """Run the full playlist import pipeline in a background asyncio task."""
    try:
        await _update_playlist_import_task(
            task_id,
            status="running",
            status_message="Fetching playlist from YouTube...",
        )
        playlist = await extract_playlist(playlist_url)
        await _update_playlist_import_task(
            task_id,
            status="running",
            status_message=f'Importing "{playlist.playlist_title}"...',
            playlist_title=playlist.playlist_title,
            imported_count=0,
        )

        async with async_session_maker() as db:
            service = LessonService(db)
            lessons = await service.import_playlist_videos(section_id, user_id, playlist)

        await _update_playlist_import_task(
            task_id,
            status="done",
            status_message="Import complete.",
            playlist_title=playlist.playlist_title,
            imported_count=len(lessons),
        )
        logger.info("Playlist import task %s completed for section %s", task_id, section_id)
    except Exception as exc:
        await _update_playlist_import_task(
            task_id,
            status="failed",
            error=str(exc),
            status_message="Import failed.",
        )
        logger.error("Playlist import task %s failed: %s", task_id, exc)
