"""Service for AI-powered course organization using OpenRouter.

Takes all lesson titles from a course and uses AI to group them into
logical sections with descriptive titles.
"""

import json
import logging
import re
import uuid

import httpx
from sqlalchemy import delete, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.lesson import Lesson
from app.models.section import Section
from app.repositories.section_repo import SectionRepository

logger = logging.getLogger(__name__)

ORGANIZE_PROMPT = (
    "You are an expert course curriculum designer. Given a flat list of lesson "
    "titles, organize them into logical sections (modules/chapters).\n\n"
    "Rules:\n"
    "- Group related lessons together into sections.\n"
    "- Create clear, descriptive section titles that summarize the group.\n"
    "- Maintain the original lesson order within each section where it makes sense.\n"
    "- Use 2-8 sections depending on the number of lessons.\n"
    "- Every lesson must be assigned to exactly one section.\n"
    "- Do NOT rename lessons — keep original titles exactly as given.\n"
    "- Section titles should be concise (3-8 words).\n\n"
    "You MUST respond with ONLY a JSON array. No explanation, no markdown, "
    "no code fences. Just the raw JSON array.\n\n"
    "Format:\n"
    '[{"section_title": "Getting Started", "lesson_indices": [0, 1, 2]}, '
    '{"section_title": "Core Concepts", "lesson_indices": [3, 4, 5]}]\n\n'
    "lesson_indices are 0-based indices into the provided lesson list."
)


def _extract_json(text: str) -> list[dict] | None:
    """Extract a JSON array from AI response, handling common wrappers."""
    text = text.strip()

    # Strip <think>...</think> blocks
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()

    # Strip markdown code fences: ```json ... ``` or ``` ... ```
    text = re.sub(r"^```(?:json)?\s*\n?", "", text)
    text = re.sub(r"\n?```\s*$", "", text)
    text = text.strip()

    # Try to find a JSON array in the text
    # First try the whole text
    try:
        parsed = json.loads(text)
        if isinstance(parsed, list):
            return parsed
    except json.JSONDecodeError:
        pass

    # Try to find [...] in the text
    match = re.search(r"\[.*\]", text, re.DOTALL)
    if match:
        try:
            parsed = json.loads(match.group())
            if isinstance(parsed, list):
                return parsed
        except json.JSONDecodeError:
            pass

    return None


class OrganizeService:
    """Uses AI to organize course lessons into sections."""

    def __init__(self, db: AsyncSession):
        self.section_repo = SectionRepository(db)
        self.db = db

    async def organize_course(
        self, course_id: uuid.UUID, user_id: uuid.UUID
    ) -> list[dict]:
        """AI-organize all lessons into new sections.

        Returns the list of new sections (as SectionResponse dicts)
        after applying the organization.
        """
        # 1. Load all current sections & lessons
        sections = await self.section_repo.list_by_course(course_id)

        # Flatten all lessons in position order
        all_lessons: list[Lesson] = []
        for section in sorted(sections, key=lambda s: s.position):
            for lesson in sorted(section.lessons, key=lambda l: l.position):
                all_lessons.append(lesson)

        if not all_lessons:
            raise ValueError("No lessons to organize.")

        if len(all_lessons) < 2:
            raise ValueError("Need at least 2 lessons to organize.")

        # 2. Build lesson title list for AI
        lesson_titles = [l.title for l in all_lessons]
        logger.info(
            "Organizing %d lessons across %d sections for course %s",
            len(all_lessons), len(sections), course_id,
        )

        # 3. Call AI to get organization plan
        plan = await self._get_ai_plan(lesson_titles)
        if not plan:
            raise ValueError(
                "LiVi could not generate an organization plan. Please try again."
            )

        logger.info("AI plan: %s", json.dumps(plan, default=str))

        # 4. Validate the plan
        all_indices: set[int] = set()
        for group in plan:
            if "section_title" not in group or "lesson_indices" not in group:
                raise ValueError(
                    "AI returned malformed plan. Please try again."
                )
            indices = group["lesson_indices"]
            if not isinstance(indices, list) or not indices:
                raise ValueError(
                    "AI returned empty section. Please try again."
                )
            for idx in indices:
                if not isinstance(idx, int) or idx < 0 or idx >= len(all_lessons):
                    raise ValueError(
                        f"AI returned invalid lesson index {idx}. Please try again."
                    )
                if idx in all_indices:
                    raise ValueError(
                        f"AI assigned lesson {idx} to multiple sections. Please try again."
                    )
                all_indices.add(idx)

        if len(all_indices) != len(all_lessons):
            missing = set(range(len(all_lessons))) - all_indices
            raise ValueError(
                f"AI missed {len(missing)} lessons. Please try again."
            )

        # 5. Apply the plan using raw SQL to avoid ORM cascade issues.
        #    Strategy: create new sections, bulk-update lesson FKs, then
        #    delete old sections (which are now empty at the DB level).

        old_section_ids = [s.id for s in sections]

        # Create new sections and collect their IDs
        new_section_map: list[tuple[uuid.UUID, list[int]]] = []
        for pos, group in enumerate(plan):
            title = str(group["section_title"])[:200]
            new_section = Section(
                course_id=course_id, title=title, position=pos
            )
            self.db.add(new_section)
            await self.db.flush()
            new_section_map.append((new_section.id, group["lesson_indices"]))

        # Bulk move lessons to new sections using raw UPDATE (bypass ORM cascade)
        for new_section_id, indices in new_section_map:
            for lesson_pos, idx in enumerate(indices):
                lesson = all_lessons[idx]
                await self.db.execute(
                    update(Lesson)
                    .where(Lesson.id == lesson.id)
                    .values(section_id=new_section_id, position=lesson_pos)
                )

        # Delete old sections using raw DELETE (bypass ORM cascade)
        if old_section_ids:
            await self.db.execute(
                delete(Section).where(Section.id.in_(old_section_ids))
            )

        await self.db.commit()

        # Expire all ORM objects so the next query sees fresh data
        self.db.expire_all()

        # 6. Return refreshed sections
        new_sections = await self.section_repo.list_by_course(course_id)
        from app.schemas.section import SectionResponse
        return [SectionResponse.model_validate(s) for s in new_sections]

    async def _get_ai_plan(self, lesson_titles: list[str]) -> list[dict] | None:
        """Call OpenRouter to get a JSON organization plan."""
        if not settings.OPENROUTER_API_KEY:
            logger.error("OPENROUTER_API_KEY not set")
            return None

        numbered = "\n".join(
            f"{i}. {title}" for i, title in enumerate(lesson_titles)
        )
        user_msg = f"Organize these {len(lesson_titles)} lessons into sections:\n\n{numbered}"

        headers = {
            "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://learner-verse.vercel.app",
            "X-Title": "Learner Verse",
        }
        payload = {
            "model": settings.OPENROUTER_MODEL,
            "messages": [
                {"role": "system", "content": ORGANIZE_PROMPT},
                {"role": "user", "content": user_msg},
            ],
            "stream": False,
            "reasoning": {"effort": "low"},
        }

        timeout = httpx.Timeout(connect=10.0, read=60.0, write=10.0, pool=10.0)

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(
                    f"{settings.OPENROUTER_BASE_URL}/chat/completions",
                    headers=headers,
                    json=payload,
                )
                if response.status_code != 200:
                    logger.error(
                        "OpenRouter returned %s: %s",
                        response.status_code, response.text[:500],
                    )
                    return None

                data = response.json()
                content = data["choices"][0]["message"]["content"]
                logger.info("AI raw response: %s", content[:1000])

                parsed = _extract_json(content)
                if parsed is None:
                    logger.error(
                        "Failed to parse JSON from AI response: %s",
                        content[:500],
                    )
                return parsed

        except httpx.TimeoutException:
            logger.error("OpenRouter timeout during organize")
            return None
        except (json.JSONDecodeError, KeyError, IndexError) as exc:
            logger.error("AI organize parse error: %s", exc)
            return None
        except httpx.HTTPError as exc:
            logger.error("OpenRouter HTTP error: %s", exc)
            return None
