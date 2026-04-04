"""Service for LiVi chat — streams AI responses via OpenRouter.

Handles conversation context loading, OpenRouter API streaming,
and message persistence in a single async generator.
"""

import logging
import uuid
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.openrouter import stream_and_strip_think_blocks
from app.repositories.chat_repo import ChatRepository

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are LiVi, a friendly and knowledgeable learning assistant for the "
    "Learner Verse platform. You help users understand concepts, study "
    "effectively, and stay motivated.\n\n"
    "Guidelines:\n"
    "- Be concise but thorough. Use markdown for formatting.\n"
    "- Use code blocks with language tags for code examples.\n"
    "- Ask clarifying questions when the request is ambiguous.\n"
    "- Encourage the learner and celebrate their progress.\n"
    "- If you don't know something, say so honestly.\n"
    "- Keep responses focused on learning and education topics.\n"
    "- When the user is on a specific page, tailor your response to that context.\n"
    "- Never mention that you received page context unless the user asks about it."
)

INLINE_VIDEO_PROMPT = (
    "You are LiVi, a friendly and knowledgeable learning assistant embedded "
    "directly below a video lesson on the Learner Verse platform.\n\n"
    "You have full context of the video the learner is watching. Help them "
    "understand concepts from this video, answer questions about its content, "
    "and explain topics covered in the video.\n\n"
    "Guidelines:\n"
    "- Be concise but thorough. Use markdown for formatting.\n"
    "- Reference the video content naturally — the learner knows you have context.\n"
    "- If you're unsure about specific video details, say so and offer general help.\n"
    "- Encourage curiosity and deeper exploration of the topic."
)

INLINE_READING_PROMPT = (
    "You are LiVi, a friendly and knowledgeable learning assistant embedded "
    "directly below a reading lesson on the Learner Verse platform.\n\n"
    "You have the FULL text of the reading material the learner is studying. "
    "Help them understand the content, clarify difficult sections, summarize "
    "key points, and answer any questions about the material.\n\n"
    "Guidelines:\n"
    "- Be concise but thorough. Use markdown for formatting.\n"
    "- Reference specific parts of the reading when relevant.\n"
    "- Explain complex concepts in simpler terms.\n"
    "- Encourage the learner and celebrate their engagement with the material."
)

INLINE_QUIZ_PROMPT = (
    "You are LiVi, a friendly learning assistant embedded below a quiz "
    "question on the Learner Verse platform.\n\n"
    "You have full context of the quiz question and its options.\n\n"
    "CRITICAL RULES:\n"
    "- NEVER reveal the correct answer directly.\n"
    "- NEVER say which option is correct (e.g., 'The answer is B').\n"
    "- Give short, focused hints — 1-3 sentences max per response.\n"
    "- Answer ONLY what the learner asked. Do not over-explain.\n"
    "- No lengthy breakdowns of every option unless specifically asked.\n"
    "- If the learner asks for the answer, politely refuse and give one "
    "targeted hint instead.\n"
    "- Keep it conversational and brief, like a quick nudge from a tutor."
)

MAX_CONTEXT_MESSAGES = 50


class ChatService:
    """Orchestrates chat streaming between the user and OpenRouter."""

    def __init__(self, db: AsyncSession):
        self.repo = ChatRepository(db)
        self.db = db

    async def stream_response(
        self,
        thread_id: uuid.UUID,
        user_id: uuid.UUID,
        user_message: str,
        page_context: str | None = None,
    ) -> AsyncGenerator[str, None]:
        """Save user message, stream AI response, save assistant message.

        Yields text chunks as they arrive from OpenRouter.
        """
        thread = await self.repo.get_thread(thread_id, user_id)
        if not thread:
            raise ValueError("Thread not found")

        # Save user message
        await self.repo.add_message(thread_id, "user", user_message)
        await self.repo.touch_thread(thread)
        await self.db.commit()

        # Build context from history
        history = await self.repo.list_messages(thread_id, limit=MAX_CONTEXT_MESSAGES)
        system_content = SYSTEM_PROMPT
        if page_context:
            system_content += f"\n\nThe user is currently viewing: {page_context}"
        messages = [{"role": "system", "content": system_content}]
        for msg in history:
            messages.append({"role": msg.role, "content": msg.content})

        # Stream from OpenRouter, stripping <think>...</think> blocks
        full_response = ""
        async for chunk in stream_and_strip_think_blocks(messages):
            full_response += chunk
            yield chunk

        # Save assistant response
        if full_response.strip():
            await self.repo.add_message(thread_id, "assistant", full_response)
            await self.repo.touch_thread(thread)

            # Auto-title on first exchange (thread still has default title)
            if thread.title == "New Chat":
                title = user_message[:60].strip()
                if len(user_message) > 60:
                    title = title.rsplit(" ", 1)[0] + "…"
                await self.repo.rename_thread(thread, title)

            await self.db.commit()


class InlineChatService:
    """Stateless inline chat — no thread persistence, context-aware responses."""

    def _build_system_prompt(
        self, context_type: str, context_data: dict
    ) -> str:
        if context_type == "video":
            prompt = INLINE_VIDEO_PROMPT
            title = context_data.get("lesson_title", "")
            yt_title = context_data.get("youtube_title", "")
            channel = context_data.get("youtube_channel", "")
            parts = []
            if title:
                parts.append(f"Lesson title: {title}")
            if yt_title:
                parts.append(f"Video title: {yt_title}")
            if channel:
                parts.append(f"Channel: {channel}")
            if parts:
                prompt += "\n\nVideo context:\n" + "\n".join(parts)
            return prompt

        if context_type == "reading":
            prompt = INLINE_READING_PROMPT
            title = context_data.get("lesson_title", "")
            notes = context_data.get("notes_markdown", "")
            if title:
                prompt += f"\n\nLesson title: {title}"
            if notes:
                # Truncate very long notes to stay within token limits
                truncated = notes[:12000]
                if len(notes) > 12000:
                    truncated += "\n\n... (content truncated)"
                prompt += f"\n\nFull reading material:\n{truncated}"
            return prompt

        if context_type == "quiz":
            prompt = INLINE_QUIZ_PROMPT
            title = context_data.get("lesson_title", "")
            question = context_data.get("question", "")
            options = context_data.get("options", [])
            if title:
                prompt += f"\n\nLesson title: {title}"
            if question:
                prompt += f"\n\nQuestion: {question}"
            if options:
                labeled = [
                    f"  {chr(65 + i)}. {opt}" for i, opt in enumerate(options)
                ]
                prompt += "\nOptions:\n" + "\n".join(labeled)
            return prompt

        return SYSTEM_PROMPT

    async def stream_response(
        self,
        user_message: str,
        history: list[dict],
        context_type: str,
        context_data: dict,
    ) -> AsyncGenerator[str, None]:
        """Stream an inline contextual AI response. No persistence."""
        system_content = self._build_system_prompt(context_type, context_data)
        messages: list[dict] = [{"role": "system", "content": system_content}]

        for msg in history:
            messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": user_message})

        async for chunk in stream_and_strip_think_blocks(messages):
            yield chunk
