import uuid
from contextlib import asynccontextmanager
from types import SimpleNamespace

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.mcp import server
from app.models.course import Course
from app.models.user import User


def _course_payload() -> dict:
    return {
        "format": "learnerverse-course-export",
        "version": 1,
        "course": {
            "title": "Docker Essentials",
            "description": "A practical Docker course.",
            "category": "technology",
            "tags": ["docker", "containers"],
        },
        "sections": [
            {
                "title": "Foundations",
                "lessons": [
                    {
                        "title": "Containers explained",
                        "lesson_type": "video",
                        "youtube_url": "https://www.youtube.com/watch?v=test",
                        "notes_markdown": "## Outcomes\nUnderstand images and containers.",
                    },
                    {
                        "title": "Dockerfile checklist",
                        "lesson_type": "note",
                        "notes_markdown": "Use small base images and pin versions.",
                    },
                    {
                        "title": "Knowledge check",
                        "lesson_type": "quiz",
                        "quiz_questions": [
                            {
                                "question": "What creates a container?",
                                "options": ["An image", "A volume", "A network", "A registry"],
                                "correct_option": 0,
                            }
                        ],
                    },
                ],
            }
        ],
    }


@pytest.mark.asyncio
async def test_mcp_can_create_review_and_publish_curated_course(
    db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch
):
    user = User(id=uuid.uuid4(), email="mcp-author@example.test", display_name="MCP Author")
    db_session.add(user)
    await db_session.commit()

    @asynccontextmanager
    async def test_session_factory():
        yield db_session

    token = SimpleNamespace(
        subject=str(user.id),
        scopes=["mcp:read", "course:write", "course:publish"],
    )
    monkeypatch.setattr(server, "async_session_maker", test_session_factory)
    monkeypatch.setattr(server, "get_access_token", lambda: token)

    created = await server.create_course_from_export(_course_payload())
    assert created.status == "draft"
    assert created.is_public is False
    assert created.section_count == 1
    assert created.lesson_count == 3
    assert created.validation_errors == []

    courses = await server.list_courses_for_review()
    assert courses.total == 1
    assert courses.courses[0].course_id == created.course_id
    assert courses.courses[0].lesson_count == 3

    review = await server.get_course_for_review(created.course_id)
    assert review.course["sections"][0]["lessons"][2]["quiz_questions"][0]["correct_option"] == 0

    updated = await server.update_course_thumbnail(
        created.course_id, "https://learnerverse.example/docker-essentials.png"
    )
    assert updated.course_id == created.course_id
    stored_course = await db_session.get(Course, uuid.UUID(created.course_id))
    assert stored_course is not None
    assert stored_course.thumbnail_url == "https://learnerverse.example/docker-essentials.png"

    with pytest.raises(PermissionError, match="confirm=true"):
        await server.publish_course(created.course_id)

    published = await server.publish_course(created.course_id, confirm=True)
    assert published.status == "ready"
    assert published.is_public is True
    assert published.validation_errors == []
