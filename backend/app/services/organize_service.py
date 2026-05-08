"""Service for AI-powered course organization using OpenRouter.

Takes all lesson titles from a course and uses AI to group them into
logical sections with descriptive titles.

Uses a background-task pattern with **database-backed** task state
so it works correctly across multiple server workers.
"""

import json
import logging
import re
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
    "Respond with ONLY raw JSON (no markdown, no prose) using this exact shape:\n"
    '{"section_titles":["Section A","Section B"], "section_for_lesson":[0,0,1,1]}\n\n'
    "Rules:\n"
    "- section_titles length must be between 2 and 8.\n"
    "- section_for_lesson length must match the lesson count from user input.\n"
    "- Every value in section_for_lesson must be an integer index into section_titles.\n"
    "- Keep lesson order in each section by index."
)

# Free models to try in order. If one is rate-limited, try the next.
_FALLBACK_MODELS = [
    "qwen/qwen3.6-plus:free",
    "openai/gpt-oss-120b:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "google/gemma-3-27b-it:free",
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
            for lesson in sorted(section.lessons, key=lambda lesson_item: lesson_item.position):
                all_lessons.append(lesson)

        if not all_lessons:
            raise ValueError("No lessons to organize.")
        if len(all_lessons) < 2:
            raise ValueError("Need at least 2 lessons to organize.")

        lesson_titles = [lesson.title for lesson in all_lessons]
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

    @staticmethod
    def _strip_wrappers(text: str) -> str:
        """Strip think blocks and markdown fences before JSON parsing."""
        cleaned = text.strip()
        cleaned = re.sub(r"<think>.*?</think>", "", cleaned, flags=re.DOTALL).strip()
        cleaned = re.sub(r"^```(?:json)?\s*\n?", "", cleaned)
        cleaned = re.sub(r"\n?```\s*$", "", cleaned)
        return cleaned.strip()

    @staticmethod
    def _extract_first_json_value(text: str) -> list | dict | None:
        """Extract the first valid top-level JSON object or array from text."""
        cleaned = OrganizeService._strip_wrappers(text)

        try:
            parsed = json.loads(cleaned)
            if isinstance(parsed, list | dict):
                return parsed
        except json.JSONDecodeError:
            pass

        for opener, closer in (("{", "}"), ("[", "]")):
            start = cleaned.find(opener)
            while start != -1:
                depth = 0
                in_string = False
                escaped = False
                for i in range(start, len(cleaned)):
                    ch = cleaned[i]

                    if in_string:
                        if escaped:
                            escaped = False
                        elif ch == "\\":
                            escaped = True
                        elif ch == '"':
                            in_string = False
                        continue

                    if ch == '"':
                        in_string = True
                        continue

                    if ch == opener:
                        depth += 1
                    elif ch == closer:
                        depth -= 1
                        if depth == 0:
                            candidate = cleaned[start : i + 1]
                            try:
                                parsed = json.loads(candidate)
                            except json.JSONDecodeError:
                                break
                            if isinstance(parsed, list | dict):
                                return parsed
                            break

                start = cleaned.find(opener, start + 1)

        return None

    @staticmethod
    def _build_plan_from_compact_mapping(
        section_titles: list,
        section_for_lesson: list,
        total_lessons: int,
    ) -> list[dict] | None:
        """Convert compact AI mapping into legacy plan format."""
        if not isinstance(section_titles, list) or not isinstance(section_for_lesson, list):
            return None

        normalized_titles = [str(title).strip() for title in section_titles]
        normalized_titles = [title for title in normalized_titles if title]
        if len(normalized_titles) < 2:
            return None

        # Keep section count bounded even if the model slightly overshoots.
        if len(normalized_titles) > 8:
            normalized_titles = normalized_titles[:8]

        # Accept small off-by-few mapping length errors and repair them.
        delta = len(section_for_lesson) - total_lessons
        if abs(delta) > 8:
            return None

        working_mapping = section_for_lesson[:total_lessons]

        last_valid = 0
        grouped: list[list[int]] = [[] for _ in normalized_titles]
        for lesson_idx, raw_section_idx in enumerate(working_mapping):
            if isinstance(raw_section_idx, int):
                section_idx = raw_section_idx
            elif isinstance(raw_section_idx, str) and raw_section_idx.strip().isdigit():
                section_idx = int(raw_section_idx.strip())
            else:
                section_idx = last_valid

            if section_idx < 0:
                section_idx = 0
            if section_idx >= len(normalized_titles):
                section_idx = len(normalized_titles) - 1

            last_valid = section_idx
            grouped[section_idx].append(lesson_idx)

        if len(working_mapping) < total_lessons:
            fill_section = last_valid
            for lesson_idx in range(len(working_mapping), total_lessons):
                grouped[fill_section].append(lesson_idx)

        plan: list[dict] = []
        for idx, raw_title in enumerate(normalized_titles):
            lesson_indices = grouped[idx]
            if not lesson_indices:
                continue

            title = str(raw_title).strip() or f"Section {idx + 1}"
            plan.append(
                {
                    "section_title": title[:200],
                    "lesson_indices": lesson_indices,
                }
            )

        if len(plan) < 2:
            if total_lessons < 2:
                return None

            split_at = max(1, total_lessons // 2)
            first_title = (normalized_titles[0] if normalized_titles else "Section 1")[:180]
            second_source = normalized_titles[1] if len(normalized_titles) > 1 else first_title
            second_title = second_source[:180]
            return [
                {
                    "section_title": first_title,
                    "lesson_indices": list(range(split_at)),
                },
                {
                    "section_title": second_title,
                    "lesson_indices": list(range(split_at, total_lessons)),
                },
            ]

        return plan

    @staticmethod
    def _parse_plan_response(content: str, total_lessons: int) -> list[dict] | None:
        """Parse AI response into the normalized plan structure."""
        parsed = OrganizeService._extract_first_json_value(content)

        if isinstance(parsed, dict):
            section_titles = parsed.get("section_titles")
            section_for_lesson = parsed.get("section_for_lesson")
            if section_titles is not None and section_for_lesson is not None:
                compact_plan = OrganizeService._build_plan_from_compact_mapping(
                    section_titles,
                    section_for_lesson,
                    total_lessons,
                )
                if compact_plan is not None:
                    return compact_plan

            sections = parsed.get("sections")
            if isinstance(sections, list):
                parsed = sections

        if isinstance(parsed, list):
            return parsed

        # Backward compatibility with prior array-extraction behavior.
        return extract_json_from_response(content)

    async def _get_ai_plan(self, lesson_titles: list[str]) -> list[dict] | None:
        """Get an AI grouping plan; tries free models and validates strictly."""
        total_lessons = len(lesson_titles)
        compact_lines = []
        for i, title in enumerate(lesson_titles):
            short = title[:60] + "…" if len(title) > 60 else title
            compact_lines.append(f"{i}:{short}")
        compact_list = "\n".join(compact_lines)

        user_msg = (
            f"Total lessons: {total_lessons}\n"
            f"Return section_for_lesson with exactly {total_lessons} integers.\n\n"
            f"Lessons:\n{compact_list}"
        )

        messages = [
            {"role": "system", "content": ORGANIZE_PROMPT},
            {"role": "user", "content": user_msg},
        ]

        # Keep this deterministic and compact for large playlists (e.g. 80+ lessons).
        max_tokens = max(1400, min(5000, 350 + total_lessons * 18))
        request_payload = {
            "max_tokens": max_tokens,
            "temperature": 0,
            # Gemini-only controls (stripped before OpenRouter call):
            "gemini_response_mime_type": "application/json",
            "gemini_thinking_budget": 0,
        }

        logger.info(
            "Organize prompt prepared: lessons=%d, prompt_chars=%d, max_tokens=%d",
            total_lessons,
            len(ORGANIZE_PROMPT) + len(user_msg),
            max_tokens,
        )

        for model in _FALLBACK_MODELS:
            logger.info("Organize: trying model %s for %d lessons", model, len(lesson_titles))
            content = await call_chat_completion(
                messages,
                model=model,
                extra_payload=request_payload,
                long_timeout=True,
            )
            if content is None:
                logger.warning("Model %s failed, trying next", model)
                continue

            parsed = self._parse_plan_response(content, total_lessons)
            if parsed is None:
                stripped = self._strip_wrappers(content)
                likely_truncated = not stripped.endswith("]") and not stripped.endswith("}")
                logger.error(
                    "JSON parse failed for model %s (len=%d, truncated=%s). head=%r tail=%r",
                    model,
                    len(content),
                    likely_truncated,
                    stripped[:260],
                    stripped[-260:],
                )
                continue

            try:
                self._validate_plan(parsed, total_lessons)
            except ValueError as exc:
                logger.error("Plan validation failed for model %s: %s", model, exc)
                continue

            logger.info("Organized into %d sections using model %s", len(parsed), model)
            return parsed

        return None
