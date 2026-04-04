"""Service for LiVi chat — streams AI responses via OpenRouter.

Handles conversation context loading, OpenRouter API streaming,
and message persistence in a single async generator.
"""

import json
import logging
import uuid
from collections.abc import AsyncGenerator
from datetime import datetime, timezone

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
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
OPENROUTER_CONNECT_TIMEOUT = 10.0
OPENROUTER_READ_TIMEOUT = 60.0


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
        in_think_block = False
        buffer = ""

        async for chunk in self._call_openrouter(messages):
            buffer += chunk

            while buffer:
                if in_think_block:
                    # Look for closing </think> tag
                    end_idx = buffer.find("</think>")
                    if end_idx != -1:
                        buffer = buffer[end_idx + 8:]  # Skip past </think>
                        in_think_block = False
                        continue
                    # Check if buffer might contain a partial </think>
                    # Keep last 8 chars in buffer in case tag is split across chunks
                    if len(buffer) > 8:
                        buffer = buffer[-8:]
                    break
                else:
                    # Look for opening <think> tag
                    start_idx = buffer.find("<think>")
                    if start_idx != -1:
                        # Yield everything before the tag
                        before = buffer[:start_idx]
                        if before:
                            full_response += before
                            yield before
                        buffer = buffer[start_idx + 7:]  # Skip past <think>
                        in_think_block = True
                        continue
                    # Check for partial <think> at end of buffer
                    # Keep last 7 chars in case tag is split
                    safe_end = len(buffer)
                    for i in range(1, min(7, len(buffer) + 1)):
                        if "<think>"[:i] == buffer[-i:]:
                            safe_end = len(buffer) - i
                            break
                    if safe_end > 0:
                        to_yield = buffer[:safe_end]
                        full_response += to_yield
                        yield to_yield
                        buffer = buffer[safe_end:]
                    break

        # Flush remaining buffer (not inside a think block)
        if buffer and not in_think_block:
            full_response += buffer
            yield buffer

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

    async def _call_openrouter(
        self, messages: list[dict]
    ) -> AsyncGenerator[str, None]:
        """Stream chat completions from OpenRouter's OpenAI-compatible API."""
        if not settings.OPENROUTER_API_KEY:
            yield "LiVi is not configured. Please set the OPENROUTER_API_KEY."
            return

        headers = {
            "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://learner-verse.vercel.app",
            "X-Title": "Learner Verse",
        }
        payload = {
            "model": settings.OPENROUTER_MODEL,
            "messages": messages,
            "stream": True,
            "reasoning": {"effort": "none"},
        }

        timeout = httpx.Timeout(
            connect=OPENROUTER_CONNECT_TIMEOUT,
            read=OPENROUTER_READ_TIMEOUT,
            write=10.0,
            pool=10.0,
        )

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                async with client.stream(
                    "POST",
                    f"{settings.OPENROUTER_BASE_URL}/chat/completions",
                    headers=headers,
                    json=payload,
                ) as response:
                    if response.status_code == 429:
                        yield "I'm being rate-limited by the AI provider. Please wait a moment and try again."
                        return
                    if response.status_code != 200:
                        logger.error(
                            "OpenRouter returned %s: %s",
                            response.status_code,
                            await response.aread(),
                        )
                        yield "Sorry, I encountered an error. Please try again."
                        return

                    async for line in response.aiter_lines():
                        if not line.startswith("data: "):
                            continue
                        data = line[6:]
                        if data.strip() == "[DONE]":
                            break
                        try:
                            chunk = json.loads(data)
                            delta = chunk.get("choices", [{}])[0].get("delta", {})
                            content = delta.get("content")
                            if content:
                                yield content
                        except (json.JSONDecodeError, IndexError, KeyError):
                            continue
        except httpx.ConnectTimeout:
            logger.warning("OpenRouter connect timeout")
            yield "The AI service is taking too long to respond. Please try again."
        except httpx.ReadTimeout:
            logger.warning("OpenRouter read timeout")
            yield "\n\n_(Response was cut short due to a timeout.)_"
        except httpx.HTTPError as exc:
            logger.error("OpenRouter HTTP error: %s", exc)
            yield "Sorry, I couldn't reach the AI service. Please try again later."


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

        # Add conversation history (already validated by schema)
        for msg in history:
            messages.append({"role": msg["role"], "content": msg["content"]})

        # Add current user message
        messages.append({"role": "user", "content": user_message})

        # Stream from OpenRouter, stripping <think>...</think> blocks
        in_think_block = False
        buffer = ""

        async for chunk in self._call_openrouter(messages):
            buffer += chunk

            while buffer:
                if in_think_block:
                    end_idx = buffer.find("</think>")
                    if end_idx != -1:
                        buffer = buffer[end_idx + 8:]
                        in_think_block = False
                        continue
                    if len(buffer) > 8:
                        buffer = buffer[-8:]
                    break
                else:
                    start_idx = buffer.find("<think>")
                    if start_idx != -1:
                        before = buffer[:start_idx]
                        if before:
                            yield before
                        buffer = buffer[start_idx + 7:]
                        in_think_block = True
                        continue
                    safe_end = len(buffer)
                    for i in range(1, min(7, len(buffer) + 1)):
                        if "<think>"[:i] == buffer[-i:]:
                            safe_end = len(buffer) - i
                            break
                    if safe_end > 0:
                        yield buffer[:safe_end]
                        buffer = buffer[safe_end:]
                    break

        if buffer and not in_think_block:
            yield buffer

    async def _call_openrouter(
        self, messages: list[dict]
    ) -> AsyncGenerator[str, None]:
        """Stream chat completions from OpenRouter."""
        if not settings.OPENROUTER_API_KEY:
            yield "LiVi is not configured. Please set the OPENROUTER_API_KEY."
            return

        headers = {
            "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://learner-verse.vercel.app",
            "X-Title": "Learner Verse",
        }
        payload = {
            "model": settings.OPENROUTER_MODEL,
            "messages": messages,
            "stream": True,
            "reasoning": {"effort": "none"},
        }

        timeout = httpx.Timeout(
            connect=OPENROUTER_CONNECT_TIMEOUT,
            read=OPENROUTER_READ_TIMEOUT,
            write=10.0,
            pool=10.0,
        )

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                async with client.stream(
                    "POST",
                    f"{settings.OPENROUTER_BASE_URL}/chat/completions",
                    headers=headers,
                    json=payload,
                ) as response:
                    if response.status_code == 429:
                        yield "I'm being rate-limited. Please wait a moment and try again."
                        return
                    if response.status_code != 200:
                        logger.error(
                            "OpenRouter returned %s", response.status_code
                        )
                        yield "Sorry, I encountered an error. Please try again."
                        return

                    async for line in response.aiter_lines():
                        if not line.startswith("data: "):
                            continue
                        data = line[6:]
                        if data.strip() == "[DONE]":
                            break
                        try:
                            chunk = json.loads(data)
                            delta = (
                                chunk.get("choices", [{}])[0].get("delta", {})
                            )
                            content = delta.get("content")
                            if content:
                                yield content
                        except (json.JSONDecodeError, IndexError, KeyError):
                            continue
        except httpx.ConnectTimeout:
            yield "The AI service is taking too long to respond. Please try again."
        except httpx.ReadTimeout:
            yield "\n\n_(Response was cut short due to a timeout.)_"
        except httpx.HTTPError as exc:
            logger.error("OpenRouter HTTP error: %s", exc)
            yield "Sorry, I couldn't reach the AI service. Please try again later."
