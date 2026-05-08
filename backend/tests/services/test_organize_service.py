import json

import pytest

from app.services import organize_service
from app.services.organize_service import OrganizeService


def _make_compact_payload(total_lessons: int) -> dict:
    # 4 sections with contiguous lesson assignments.
    section_titles = [
        "Foundations",
        "Tooling",
        "Workflows",
        "Advanced Topics",
    ]

    section_for_lesson = []
    cut1 = total_lessons // 4
    cut2 = total_lessons // 2
    cut3 = (total_lessons * 3) // 4

    for idx in range(total_lessons):
        if idx < cut1:
            section_for_lesson.append(0)
        elif idx < cut2:
            section_for_lesson.append(1)
        elif idx < cut3:
            section_for_lesson.append(2)
        else:
            section_for_lesson.append(3)

    return {
        "section_titles": section_titles,
        "section_for_lesson": section_for_lesson,
    }


def test_parse_compact_mapping_for_large_playlist() -> None:
    total_lessons = 85
    content = json.dumps(_make_compact_payload(total_lessons))

    plan = OrganizeService._parse_plan_response(content, total_lessons)

    assert plan is not None
    OrganizeService._validate_plan(plan, total_lessons)
    assert 2 <= len(plan) <= 8


def test_parse_compact_mapping_inside_markdown_fence() -> None:
    payload = _make_compact_payload(12)
    content = "```json\n" + json.dumps(payload, indent=2) + "\n```"

    plan = OrganizeService._parse_plan_response(content, 12)

    assert plan is not None
    OrganizeService._validate_plan(plan, 12)


def test_parse_compact_mapping_repairs_small_length_mismatch() -> None:
    content = json.dumps(
        {
            "section_titles": ["One", "Two"],
            # Small mismatch: total lessons is 5 but only 2 assignments provided.
            "section_for_lesson": [0, 1],
        }
    )

    plan = OrganizeService._parse_plan_response(content, 5)

    assert plan is not None
    OrganizeService._validate_plan(plan, 5)


def test_parse_compact_mapping_rejects_large_length_mismatch() -> None:
    content = json.dumps(
        {
            "section_titles": ["One", "Two"],
            # Large mismatch should be treated as malformed output.
            "section_for_lesson": [0],
        }
    )

    plan = OrganizeService._parse_plan_response(content, 20)

    assert plan is None


@pytest.mark.asyncio
async def test_get_ai_plan_retries_after_parse_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    service = OrganizeService(db=None)
    lesson_titles = [f"Lesson {i}" for i in range(85)]

    responses = [
        "Not JSON at all",
        json.dumps(_make_compact_payload(85)),
    ]
    calls = []

    async def fake_call_chat_completion(
        messages, *, model=None, extra_payload=None, long_timeout=False
    ):
        calls.append(
            {
                "model": model,
                "extra_payload": extra_payload,
                "long_timeout": long_timeout,
                "messages": messages,
            }
        )
        return responses.pop(0)

    monkeypatch.setattr(organize_service, "_FALLBACK_MODELS", ["model-a", "model-b"])
    monkeypatch.setattr(
        organize_service,
        "call_chat_completion",
        fake_call_chat_completion,
    )

    plan = await service._get_ai_plan(lesson_titles)

    assert plan is not None
    OrganizeService._validate_plan(plan, 85)

    # First model fails parse, second model succeeds.
    assert [c["model"] for c in calls] == ["model-a", "model-b"]

    # Ensure deterministic and large-playlist-safe payload controls are sent.
    payload = calls[0]["extra_payload"]
    assert payload is not None
    assert payload["temperature"] == 0
    assert payload["max_tokens"] >= 1400
    assert payload["gemini_response_mime_type"] == "application/json"
    assert payload["gemini_thinking_budget"] == 0
    assert calls[0]["long_timeout"] is True
