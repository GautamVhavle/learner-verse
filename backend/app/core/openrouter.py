"""Shared OpenRouter API client for AI completions.

Provides both streaming and non-streaming interfaces to avoid
duplicating HTTP/auth/error-handling logic across services.
"""

import json
import logging
import re
from collections.abc import AsyncGenerator

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

CONNECT_TIMEOUT = 10.0
READ_TIMEOUT = 60.0
WRITE_TIMEOUT = 10.0
POOL_TIMEOUT = 10.0

_HEADERS_BASE = {
    "Content-Type": "application/json",
    "HTTP-Referer": "https://learner-verse.vercel.app",
    "X-Title": "Learner Verse",
}

_TIMEOUT = httpx.Timeout(
    connect=CONNECT_TIMEOUT,
    read=READ_TIMEOUT,
    write=WRITE_TIMEOUT,
    pool=POOL_TIMEOUT,
)


def _build_headers() -> dict[str, str]:
    """Build request headers including the current API key."""
    return {**_HEADERS_BASE, "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}"}


# ── Streaming ────────────────────────────────────────────────


async def stream_chat_completions(
    messages: list[dict],
    *,
    model: str | None = None,
    extra_payload: dict | None = None,
) -> AsyncGenerator[str, None]:
    """Stream chat completions from OpenRouter's OpenAI-compatible API.

    Yields text chunks as they arrive. On error, yields a user-friendly
    error message instead of raising (safe for SSE consumers).
    """
    if not settings.OPENROUTER_API_KEY:
        yield "LiVi is not configured. Please set the OPENROUTER_API_KEY."
        return

    payload: dict = {
        "model": model or settings.OPENROUTER_MODEL,
        "messages": messages,
        "stream": True,
        "reasoning": {"effort": "none"},
        **(extra_payload or {}),
    }

    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            async with client.stream(
                "POST",
                f"{settings.OPENROUTER_BASE_URL}/chat/completions",
                headers=_build_headers(),
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


# ── Non-streaming ────────────────────────────────────────────


async def call_chat_completion(
    messages: list[dict],
    *,
    model: str | None = None,
    extra_payload: dict | None = None,
) -> str | None:
    """Make a non-streaming chat completion request.

    Returns the assistant's response content, or None on failure.
    """
    if not settings.OPENROUTER_API_KEY:
        logger.error("OPENROUTER_API_KEY not set")
        return None

    payload: dict = {
        "model": model or settings.OPENROUTER_MODEL,
        "messages": messages,
        "stream": False,
        **(extra_payload or {}),
    }

    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            response = await client.post(
                f"{settings.OPENROUTER_BASE_URL}/chat/completions",
                headers=_build_headers(),
                json=payload,
            )
            if response.status_code != 200:
                logger.error(
                    "OpenRouter returned %s: %s",
                    response.status_code,
                    response.text[:500],
                )
                return None

            data = response.json()
            return data["choices"][0]["message"]["content"]

    except httpx.TimeoutException:
        logger.error("OpenRouter timeout")
        return None
    except (json.JSONDecodeError, KeyError, IndexError) as exc:
        logger.error("OpenRouter parse error: %s", exc)
        return None
    except httpx.HTTPError as exc:
        logger.error("OpenRouter HTTP error: %s", exc)
        return None


# ── Think-block stripping ────────────────────────────────────


async def stream_and_strip_think_blocks(
    messages: list[dict],
    *,
    model: str | None = None,
    extra_payload: dict | None = None,
) -> AsyncGenerator[str, None]:
    """Stream completions with ``<think>...</think>`` blocks automatically removed.

    Wraps ``stream_chat_completions`` with a stateful buffer that
    filters out reasoning blocks before yielding to the consumer.
    """
    in_think_block = False
    buffer = ""

    async for chunk in stream_chat_completions(
        messages, model=model, extra_payload=extra_payload
    ):
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


def extract_json_from_response(text: str) -> list[dict] | None:
    """Extract a JSON array from an AI response, handling common wrappers.

    Strips ``<think>`` blocks and markdown code fences before parsing.
    """
    text = text.strip()
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()
    text = re.sub(r"^```(?:json)?\s*\n?", "", text)
    text = re.sub(r"\n?```\s*$", "", text)
    text = text.strip()

    try:
        parsed = json.loads(text)
        if isinstance(parsed, list):
            return parsed
    except json.JSONDecodeError:
        pass

    match = re.search(r"\[.*\]", text, re.DOTALL)
    if match:
        try:
            parsed = json.loads(match.group())
            if isinstance(parsed, list):
                return parsed
        except json.JSONDecodeError:
            pass

    return None
