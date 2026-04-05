"""Service for AI-powered course organization using OpenRouter.

Takes all lesson titles from a course and uses AI to group them into
logical sections with descriptive titles.

Uses a background-task pattern with **database-backed** task state
so it works correctly across multiple server workers.
"""

import asyncio
import json
import logging
import uuid

from sqlalchemy import delete, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_maker
from app.core.openrouter import call_chat_completion, extract_json_from_response
from app.models.lesson import Lesson
from app.models.section import Section
from app.repositories.section_repo import SectionRepository

logger = logging.getLogger(__name__)

ORGANIZE_PROMPT = (
    "You are an expert course curriculum designer.\n"
    "Given a numbered list of lesson titles, group them into 2-8 logical "
    "sections. Keep original order where it makes sense.\n"
    "Section titles: concise, 3-8 words.\n"
    "Every lesson index must appear exactly once.\n\n"
    "Respond with ONLY a raw JSON array, no markdown, no explanation:\n"
    '[{"section_title":"...", "lesson_indices":[0,1,2]}, ...]'
)

# Free models to try in order. If one is rate-limited, try the next.
_FALLBACK_MODELS = [
    "nvidia/nemotron-3-super-120b-a12b:free",
    "meta-llama/llama-4-maverick:free",
    "google/gemma-3-27b-it:free",
    "qwen/qwen3-235b-a22b:free",
]


# ── DB-backed task helpers ──────────────────────────────────

async def create_task(db: AsyncSession, course_id: str) -> str:
    """Insert a new pending task row and return its ID."""
    task_id = uuid.uuid4().hex[:12]
    await db.execute(
        text(
            "INSERT INTO organize_tasks (id, course_id, status) "
            "VALUES (:id, :cid, 'pending') "
            "ON CONFLICT (id) DO NOTHING"
        ),
        {"id": task_id, "cid": course_id},
    )
    await db.commit()
    return task_id


async def get_task_status(db: AsyncSession, task_id: str) -> dict | None:
    """Return {status, error} or None if not found."""
    row = (
        await db.execute(
            text("SELECT status, error FROM organize_tasks WHERE id = :id"),
            {"id": task_id},
        )
    ).first()
    if not row:
        return None
    return {"status": row[0], "error": row[1]}


async def _set_task_done(task_id: str) -> None:
    async with async_session_maker() as db:
        await db.execute(
            text("UPDATE organize_tasks SET status = 'done' WHERE id = :id"),
            {"id": task_id},
        )
        await db.commit()


async def _set_task_failed(task_id: str, error: str) -> None:
    async with async_session_maker() as db:
        await db.execute(
            text("UPDATE organize_tasks SET status = 'failed', error = :err WHERE id = :id"),
            {"id": task_id, "err": error[:500]},
        )
        await db.commit()


# ── Background runner ───────────────────────────────────────

async def run_organize_in_background(
    task_id: str,
    course_id: uuid.UUID,
    user_id: uuid.UUID,
) -> None:
    """Run the full organize pipeline in a background asyncio task."""
    try:
        async with async_session_maker() as db:
            service = OrganizeService(db)
            await service.organize_course(course_id, user_id)
        await _set_task_done(task_id)
        logger.info("Organize task %s completed for course %s", task_id, course_id)
    except Exception as exc:
        await _set_task_failed(task_id, str(exc))
        logger.error("Organize task %s failed: %s", task_id, exc)


# ── Organize service ────────────────────────────────────────

class OrganizeService:
    """Uses AI to organize course lessons into sections."""

    def __init__(self, db: AsyncSession):
        self.section_repo = SectionRepository(db)
        self.db = db

    async def organize_course(
        self, course_id: uuid.UUID, user_id: uuid.UUID
    ) -> None:
        """AI-organize all lessons into new sections."""
        sections = await self.section_repo.list_by_course(course_id)

        all_lessons: list[Lesson] = []
        for section in sorted(sections, key=lambda s: s.position):
            for lesson in sorted(section.lessons, key=lambda l: l.position):
                all_lessons.append(lesson)

        if not all_lessons:
            raise ValueError("No lessons to organize.")
        if len(all_lessons) < 2:
            raise ValueError("Need at least 2 lessons to organize.")

        lesson_titles = [l.title for l in all_lessons]
        logger.info(
            "Organizing %d lessons across %d sections for course %s",
            len(all_lessons), len(sections), course_id,
        )

        plan = await self._get_ai_plan(lesson_titles)
        if not plan:
            raise ValueError(
                "LiVi could not generate an organization plan. Please try again."
            )

        logger.info("AI plan: %s", json.dumps(plan, default=str))
        self._validate_plan(plan, len(all_lessons))

        old_section_ids = [s.id for s in sections]

        new_section_map: list[tuple[uuid.UUID, list[int]]] = []
        for pos, group in enumerate(plan):
            title = str(group["section_title"])[:200]
            new_section = Section(
                course_id=course_id, title=title, position=pos
            )
            self.db.add(new_section)
            await self.db.flush()
            new_section_map.append((new_section.id, group["lesson_indices"]))

        for new_section_id, indices in new_section_map:
            for lesson_pos, idx in enumerate(indices):
                lesson = all_lessons[idx]
                await self.db.execute(
                    update(Lesson)
                    .where(Lesson.id == lesson.id)
                    .values(section_id=new_section_id, position=lesson_pos)
                )

        if old_section_ids:
            await self.db.execute(
                delete(Section).where(Section.id.in_(old_section_ids))
            )

        await self.db.commit()

    @staticmethod
    def _validate_plan(plan: list[dict], total_lessons: int) -> None:
        all_indices: set[int] = set()
        for group in plan:
            if "section_title" not in group or "lesson_indices" not in group:
                raise ValueError("AI returned malformed plan. Please try again.")
            indices = group["lesson_indices"]
            if not isinstance(indices, list) or not indices:
                raise ValueError("AI returned empty section. Please try again.")
            for idx in indices:
                if not isinstance(idx, int) or idx < 0 or idx >= total_lessons:
                    raise ValueError(
                        f"AI returned invalid lesson index {idx}. Please try again."
                    )
                if idx in all_indices:
                    raise ValueError(
                        f"AI assigned lesson {idx} to multiple sections. Please try again."
                    )
                all_indices.add(idx)
        if len(all_indices) != total_lessons:
            missing = set(range(total_lessons)) - all_indices
            raise ValueError(f"AI missed {len(missing)} lessons. Please try again.")

    async def _get_ai_plan(self, lesson_titles: list[str]) -> list[dict] | None:
        """One API call. If the model is rate-limited, try the next free model."""
        compact_lines = []
        for i, title in enumerate(lesson_titles):
            short = title[:60] + "…" if len(title) > 60 else title
            compact_lines.append(f"{i}:{short}")
        compact_list = "\n".join(compact_lines)

        user_msg = (
            f"{len(lesson_titles)} lessons. Group into sections.\n\n{compact_list}"
        )

        messages = [
            {"role": "system", "content": ORGANIZE_PROMPT},
            {"role": "user", "content": user_msg},
        ]

        for model in _FALLBACK_MODELS:
            logger.info("Organize: trying model %s for %d lessons", model, len(lesson_titles))
            content = await call_chat_completion(
                messages,
                model=model,
                extra_payload={"max_tokens": 2000},
                long_timeout=True,
            )
            if content is None:
                logger.warning("Model %s failed, trying next", model)
                continue

            parsed = extract_json_from_response(content)
            if parsed is None:
                logger.error("JSON parse failed for model %s: %s", model, content[:500])
                continue

            logger.info("Organized into %d sections using model %s", len(parsed), model)
            return parsed

        return None
