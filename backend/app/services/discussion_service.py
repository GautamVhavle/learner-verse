"""Service for course discussion rooms.

Handles message creation, enrollment checks, creator detection,
and @MiVi AI responses via OpenRouter.
"""

import json
import logging
import re
import uuid

import httpx
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.course import Course
from app.models.discussion_message import DiscussionMessage
from app.models.user import User
from app.repositories.discussion_repo import DiscussionRepository
from app.repositories.enrollment_repo import is_enrolled
from app.schemas.discussion import (
    DiscussionMessageCreate,
    DiscussionMessageResponse,
    DiscussionPage,
    ReplyBrief,
)

logger = logging.getLogger(__name__)

MIVI_SYSTEM_PROMPT = (
    "You are MiVi, a helpful AI learning assistant embedded in a course "
    "discussion room on the Learner Verse platform.\n\n"
    "Guidelines:\n"
    "- Answer the user's question clearly and concisely.\n"
    "- Use simple language. Be friendly and encouraging.\n"
    "- If the question is about a course topic, provide a helpful explanation.\n"
    "- If unsure, say so honestly and suggest the user ask the course creator.\n"
    "- Keep responses under 500 words. Use markdown for formatting.\n"
    "- Do not generate code unless specifically asked.\n"
    "- You are in a group discussion — be respectful and inclusive."
)

MIVI_TAG_PATTERN = re.compile(r"@[Mm]i[Vv]i\b")


class DiscussionService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = DiscussionRepository(db)

    async def list_messages(
        self,
        course_id: uuid.UUID,
        user: User,
        *,
        before: str | None = None,
        limit: int = 50,
    ) -> DiscussionPage:
        """Paginated message list. Verifies enrollment or ownership."""
        await self._check_access(course_id, user)

        from datetime import datetime, timezone

        before_dt = None
        if before:
            before_dt = datetime.fromisoformat(before)

        limit = min(limit, 100)
        messages = await self.repo.list_messages(
            course_id, before=before_dt, limit=limit + 1
        )
        has_more = len(messages) > limit
        if has_more:
            messages = messages[:limit]

        # Reverse to chronological order (oldest first for display)
        messages.reverse()

        # Build reply previews
        reply_ids = {m.reply_to_id for m in messages if m.reply_to_id}
        reply_map: dict[uuid.UUID, DiscussionMessage] = {}
        for rid in reply_ids:
            msg = await self.repo.get_by_id(rid)
            if msg:
                reply_map[rid] = msg

        items = []
        for m in messages:
            resp = DiscussionMessageResponse.model_validate(m)
            if m.reply_to_id and m.reply_to_id in reply_map:
                r = reply_map[m.reply_to_id]
                resp.reply_preview = ReplyBrief(
                    id=r.id,
                    display_name=r.display_name,
                    role=r.role,
                    content=r.content[:120],
                )
            items.append(resp)

        return DiscussionPage(items=items, has_more=has_more)

    async def send_message(
        self,
        course_id: uuid.UUID,
        user: User,
        payload: DiscussionMessageCreate,
    ) -> DiscussionMessageResponse:
        """Create a user message. If @MiVi is tagged, trigger AI reply."""
        await self._check_access(course_id, user)

        # Determine role
        from sqlalchemy import select

        result = await self.db.execute(
            select(Course.user_id).where(Course.id == course_id)
        )
        course_owner_id = result.scalar_one_or_none()
        role = "creator" if course_owner_id == user.id else "learner"

        msg = DiscussionMessage(
            course_id=course_id,
            user_id=user.id,
            role=role,
            display_name=user.display_name or user.email,
            content=payload.content,
            reply_to_id=payload.reply_to_id,
        )
        msg = await self.repo.create(msg)
        await self.db.commit()

        resp = DiscussionMessageResponse.model_validate(msg)

        # Check for @MiVi tag
        if MIVI_TAG_PATTERN.search(payload.content):
            ai_resp = await self._generate_mivi_response(
                course_id, payload.content
            )
            if ai_resp:
                ai_msg = DiscussionMessage(
                    course_id=course_id,
                    user_id=None,
                    role="ai",
                    display_name="MiVi",
                    content=ai_resp,
                    reply_to_id=msg.id,
                )
                await self.repo.create(ai_msg)
                await self.db.commit()

        return resp

    async def _check_access(
        self, course_id: uuid.UUID, user: User
    ) -> None:
        """Ensure course is public and user is enrolled or is the course creator."""
        from sqlalchemy import select

        result = await self.db.execute(
            select(Course.user_id, Course.is_public).where(Course.id == course_id)
        )
        row = result.one_or_none()
        if row is None:
            raise HTTPException(status_code=404, detail="Course not found.")
        owner_id, is_public = row
        # Creator always has access regardless of public status
        if owner_id == user.id:
            return
        if not is_public:
            raise HTTPException(
                status_code=403,
                detail="Discussions are only available for published courses.",
            )
        enrolled = await is_enrolled(
            self.db, user_id=user.id, course_id=course_id
        )
        if not enrolled:
            raise HTTPException(
                status_code=403, detail="Enroll in the course to join discussions."
            )

    async def _generate_mivi_response(
        self, course_id: uuid.UUID, user_question: str
    ) -> str | None:
        """Call OpenRouter to generate a MiVi reply."""
        if not settings.OPENROUTER_API_KEY:
            return None

        # Get last few messages for context
        recent = await self.repo.list_messages(course_id, limit=10)
        context_messages = [
            {"role": "system", "content": MIVI_SYSTEM_PROMPT}
        ]
        for m in reversed(recent):
            r = "assistant" if m.role == "ai" else "user"
            prefix = f"[{m.display_name}] " if m.role != "ai" else ""
            context_messages.append(
                {"role": r, "content": f"{prefix}{m.content}"}
            )

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"{settings.OPENROUTER_BASE_URL}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": settings.OPENROUTER_MODEL,
                        "messages": context_messages,
                        "max_tokens": 800,
                    },
                )
                resp.raise_for_status()
                data = resp.json()
                return data["choices"][0]["message"]["content"]
        except Exception:
            logger.exception("MiVi discussion response failed")
            return "Sorry, I'm having trouble responding right now. Please try again!"
