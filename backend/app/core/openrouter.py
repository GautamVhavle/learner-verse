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

# Longer timeout for heavy non-streaming calls (e.g. organizing 80+ lessons)
_TIMEOUT_LONG = httpx.Timeout(
    connect=CONNECT_TIMEOUT,
    read=180.0,
    write=WRITE_TIMEOUT,
    pool=POOL_TIMEOUT,
)

RATE_LIMIT_MESSAGE = (
    "I'm being rate-limited by the AI provider. Please wait a moment and try again."
)


def _openrouter_payload_overrides(extra_payload: dict | None) -> dict:
    """Return payload keys safe to send to OpenRouter."""
    if not extra_payload:
        return {}
    return {k: v for k, v in extra_payload.items() if not k.startswith("gemini_")}


def _build_headers() -> dict[str, str]:
    """Build request headers including the current API key."""
    return {**_HEADERS_BASE, "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}"}


def _normalize_message_content(content: object) -> str:
    """Normalize OpenAI-style message content into plain text."""
    if isinstance(content, str):
        return content

    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
                continue
            if isinstance(item, dict) and item.get("type") == "text":
                text = item.get("text")
                if isinstance(text, str):
                    parts.append(text)
        return "\n".join(parts)

    return "" if content is None else str(content)


def _gemini_payload_from_messages(
    messages: list[dict], *, extra_payload: dict | None = None
) -> dict:
    """Convert OpenAI-style messages into a Gemini generateContent payload."""
    system_lines: list[str] = []
    contents: list[dict] = []

    for msg in messages:
        role = str(msg.get("role", "user"))
        text = _normalize_message_content(msg.get("content", "")).strip()
        if not text:
            continue

        if role == "system":
            system_lines.append(text)
            continue

        gemini_role = "model" if role == "assistant" else "user"
        contents.append({"role": gemini_role, "parts": [{"text": text}]})

    if not contents:
        contents = [{"role": "user", "parts": [{"text": "Continue."}]}]

    payload: dict = {"contents": contents}

    if system_lines:
        payload["system_instruction"] = {"parts": [{"text": "\n\n".join(system_lines)}]}

    generation_config: dict = {}
    if extra_payload:
        max_tokens = extra_payload.get("max_tokens")
        if isinstance(max_tokens, int) and max_tokens > 0:
            generation_config["maxOutputTokens"] = max_tokens

        temperature = extra_payload.get("temperature")
        if isinstance(temperature, int | float):
            generation_config["temperature"] = temperature

        top_p = extra_payload.get("top_p")
        if isinstance(top_p, int | float):
            generation_config["topP"] = top_p

        top_k = extra_payload.get("top_k")
        if isinstance(top_k, int):
            generation_config["topK"] = top_k

        stop = extra_payload.get("stop")
        if isinstance(stop, str) and stop:
            generation_config["stopSequences"] = [stop]
        elif isinstance(stop, list):
            sequences = [s for s in stop if isinstance(s, str) and s]
            if sequences:
                generation_config["stopSequences"] = sequences

        response_mime_type = extra_payload.get("gemini_response_mime_type")
        if isinstance(response_mime_type, str) and response_mime_type:
            generation_config["responseMimeType"] = response_mime_type

        thinking_budget = extra_payload.get("gemini_thinking_budget")
        if isinstance(thinking_budget, int) and thinking_budget >= 0:
            generation_config["thinkingConfig"] = {"thinkingBudget": thinking_budget}

    if generation_config:
        payload["generationConfig"] = generation_config

    return payload


def _extract_gemini_text(data: dict) -> str | None:
    """Extract plain text from Gemini generateContent JSON response."""
    candidates = data.get("candidates")
    if not isinstance(candidates, list) or not candidates:
        return None

    first = candidates[0] if isinstance(candidates[0], dict) else {}
    content = first.get("content") if isinstance(first, dict) else {}
    parts = content.get("parts") if isinstance(content, dict) else []
    if not isinstance(parts, list):
        return None

    chunks: list[str] = []
    for part in parts:
        if isinstance(part, dict):
            text = part.get("text")
            if isinstance(text, str) and text:
                chunks.append(text)

    merged = "".join(chunks).strip()
    return merged or None


async def call_gemini_completion(
    messages: list[dict],
    *,
    model: str | None = None,
    extra_payload: dict | None = None,
    long_timeout: bool = False,
) -> str | None:
    """Call Gemini generateContent API and return text, or None on failure."""
    if not settings.GEMINI_API_KEY:
        logger.info("Gemini fallback skipped: GEMINI_API_KEY not set")
        return None

    used_model = model or settings.GEMINI_MODEL
    payload = _gemini_payload_from_messages(messages, extra_payload=extra_payload)
    timeout = _TIMEOUT_LONG if long_timeout else _TIMEOUT

    logger.info(
        "Gemini request: model=%s, timeout=%.0fs, msg_chars=%d",
        used_model,
        timeout.read,
        sum(len(_normalize_message_content(m.get("content", ""))) for m in messages),
    )

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                f"{settings.GEMINI_BASE_URL}/models/{used_model}:generateContent",
                headers={"x-goog-api-key": settings.GEMINI_API_KEY},
                json=payload,
            )

        if response.status_code == 429:
            logger.warning("Gemini rate-limited (429) for model %s", used_model)
            return None

        if response.status_code != 200:
            logger.error("Gemini HTTP %s: %s", response.status_code, response.text[:500])
            return None

        data = response.json()

        if "error" in data:
            err = data["error"]
            if isinstance(err, dict):
                err_msg = err.get("message", str(err))
            else:
                err_msg = str(err)
            logger.error("Gemini error: %s", err_msg)
            return None

        content = _extract_gemini_text(data)
        if not content:
            logger.error("Gemini response missing text: %s", json.dumps(data)[:500])
            return None

        logger.info("Gemini response: %d chars", len(content))
        return content

    except httpx.TimeoutException:
        logger.error("Gemini timeout after %.0fs for model %s", timeout.read, used_model)
        return None
    except (json.JSONDecodeError, KeyError, IndexError) as exc:
        logger.error("Gemini parse error: %s", exc)
        return None
    except httpx.HTTPError as exc:
        logger.error("Gemini HTTP error: %s", exc)
        return None


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
        **_openrouter_payload_overrides(extra_payload),
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
                    logger.warning("OpenRouter streaming rate-limited (429); trying Gemini")
                    fallback = await call_gemini_completion(
                        messages,
                        extra_payload=extra_payload,
                    )
                    if fallback is not None:
                        yield fallback
                    else:
                        yield RATE_LIMIT_MESSAGE
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
    long_timeout: bool = False,
) -> str | None:
    """Make a non-streaming chat completion request.

    Returns the assistant's response content, or None on failure.
    Set long_timeout=True for heavy prompts (e.g. organizing many lessons).
    """
    if not settings.OPENROUTER_API_KEY:
        logger.error("OPENROUTER_API_KEY not set")
        return None

    used_model = model or settings.OPENROUTER_MODEL
    openrouter_extra = _openrouter_payload_overrides(extra_payload)
    payload: dict = {
        "model": used_model,
        "messages": messages,
        "stream": False,
        **openrouter_extra,
    }

    timeout = _TIMEOUT_LONG if long_timeout else _TIMEOUT
    logger.info(
        "OpenRouter request: model=%s, timeout=%.0fs, msg_chars=%d",
        used_model,
        timeout.read,
        sum(len(m.get("content", "")) for m in messages),
    )

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                f"{settings.OPENROUTER_BASE_URL}/chat/completions",
                headers=_build_headers(),
                json=payload,
            )
            if response.status_code == 429:
                logger.warning("OpenRouter rate-limited (429) for model %s", used_model)
                fallback = await call_gemini_completion(
                    messages,
                    extra_payload=extra_payload,
                    long_timeout=long_timeout,
                )
                if fallback is not None:
                    logger.info("Served completion from Gemini fallback after OpenRouter 429")
                    return fallback
                return None

            if response.status_code != 200:
                logger.error("OpenRouter HTTP %s: %s", response.status_code, response.text[:500])
                return None

            data = response.json()

            if "error" in data:
                err_msg = (
                    data["error"]
                    if isinstance(data["error"], str)
                    else data["error"].get("message", str(data["error"]))
                )
                logger.error("OpenRouter error: %s", err_msg)
                return None

            choices = data.get("choices")
            if not choices:
                logger.error("OpenRouter response missing 'choices': %s", json.dumps(data)[:500])
                return None

            content = choices[0]["message"]["content"]
            logger.info("OpenRouter response: %d chars", len(content))
            return content

    except httpx.TimeoutException:
        logger.error("OpenRouter timeout after %.0fs for model %s", timeout.read, used_model)
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

    async for chunk in stream_chat_completions(messages, model=model, extra_payload=extra_payload):
        buffer += chunk

        while buffer:
            if in_think_block:
                end_idx = buffer.find("</think>")
                if end_idx != -1:
                    buffer = buffer[end_idx + 8 :]
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
                    buffer = buffer[start_idx + 7 :]
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
