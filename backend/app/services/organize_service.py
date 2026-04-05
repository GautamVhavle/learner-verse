"""Service for AI-powered course organization using LangChain + OpenRouter.

Takes all lesson titles from a course and uses AI to group them into
logical sections with descriptive titles.  Uses LangChain's structured
output for reliable JSON parsing and built-in retry logic.

Optimised for speed: compact prompt format, no reasoning tokens,
capped output — keeps even 100+ lesson courses under the platform
timeout (~100 s).
"""

import json
import logging
import uuid

from langchain_openrouter import ChatOpenRouter
from pydantic import BaseModel, Field
from sqlalchemy import delete, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.lesson import Lesson
from app.models.section import Section
from app.repositories.section_repo import SectionRepository

logger = logging.getLogger(__name__)

# Compact system prompt — every token counts for speed.
ORGANIZE_PROMPT = (
    "You are an expert course curriculum designer.\n"
    "Given a numbered list of lesson titles, group them into 2-8 logical "
    "sections. Keep original order where it makes sense. "
    "Section titles: concise, 3-8 words. "
    "Every lesson index must appear exactly once."
)


# ── Pydantic schemas for structured output ──────────────────

class SectionGroup(BaseModel):
    """A single section in the organization plan."""
    section_title: str = Field(description="Concise section title (3-8 words)")
    lesson_indices: list[int] = Field(description="0-based indices of lessons in this section")


class OrganizationPlan(BaseModel):
    """Complete AI-generated organization plan."""
    sections: list[SectionGroup] = Field(description="List of sections grouping all lessons")


def _build_llm() -> ChatOpenRouter:
    """Instantiate a ChatOpenRouter tuned for fast structured output."""
    return ChatOpenRouter(
        model=settings.OPENROUTER_MODEL,
        openrouter_api_key=settings.OPENROUTER_API_KEY,
        max_retries=3,
        timeout=90,
        temperature=0.2,
        max_tokens=2000,
        # No reasoning tokens — grouping is pattern-matching, not logic.
        reasoning={"effort": "none"},
    )


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

    async def _get_ai_plan(
        self, lesson_titles: list[str], *, _retries: int = 3
    ) -> list[dict] | None:
        """Get an organization plan in a single fast call.

        Speed optimisations (vs. the naïve approach):
        • Titles truncated to 60 chars → fewer input tokens
        • Compact `idx:title` format → ~40 % fewer tokens than numbered list
        • reasoning=none, max_tokens=2000 → model skips CoT, caps output
        • Structured output → no manual JSON parsing needed

        All titles are sent in **one call** so the model sees full context.
        """
        # Build a compact lesson list — truncate long titles
        compact_lines = []
        for i, title in enumerate(lesson_titles):
            short = title[:60] + "…" if len(title) > 60 else title
            compact_lines.append(f"{i}:{short}")
        compact_list = "\n".join(compact_lines)

        user_msg = (
            f"{len(lesson_titles)} lessons. Group into sections.\n\n{compact_list}"
        )

        messages = [
            ("system", ORGANIZE_PROMPT),
            ("human", user_msg),
        ]

        llm = _build_llm()
        structured_llm = llm.with_structured_output(OrganizationPlan)

        for attempt in range(1, _retries + 1):
            try:
                logger.info(
                    "Organize AI call (attempt %d/%d) for %d lessons, "
                    "~%d prompt chars",
                    attempt, _retries, len(lesson_titles), len(compact_list),
                )
                result: OrganizationPlan = await structured_llm.ainvoke(messages)
                plan = [g.model_dump() for g in result.sections]
                logger.info(
                    "AI returned %d sections (attempt %d/%d)",
                    len(plan), attempt, _retries,
                )
                return plan
            except Exception as exc:
                logger.error(
                    "Organize AI failed (attempt %d/%d): %s",
                    attempt, _retries, exc,
                )
                if attempt >= _retries:
                    break

        logger.error(
            "All %d attempts failed for %d lessons", _retries, len(lesson_titles)
        )
        return None
