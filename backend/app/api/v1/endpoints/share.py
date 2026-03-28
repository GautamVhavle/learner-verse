"""Public shareable link endpoint — serves OpenGraph HTML for social crawlers."""

import uuid

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models.course import Course
from app.models.enrollment import CourseEnrollment
from app.models.lesson import Lesson
from app.models.rating import CourseRating
from app.models.section import Section
from app.models.user import User

router = APIRouter(prefix="/share", tags=["share"])

# Common bots that fetch OG tags
_BOT_AGENTS = (
    "facebookexternalhit", "twitterbot", "linkedinbot", "slackbot",
    "discordbot", "whatsapp", "telegrambot", "googlebot", "bingbot",
    "embedly", "quora link preview", "showyoubot", "outbrain",
    "pinterestbot", "applebot",
)

FRONTEND_URL = "https://learner-verse.vercel.app"


def _is_bot(user_agent: str) -> bool:
    """Check if the request comes from a social media crawler."""
    ua = user_agent.lower()
    return any(bot in ua for bot in _BOT_AGENTS)


def _escape(text: str | None) -> str:
    """Escape HTML entities for safe meta tag embedding."""
    if not text:
        return ""
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#x27;")
    )


@router.get("/course/{course_id}")
async def share_course(
    course_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Serve OpenGraph HTML for bots, redirect browsers to the SPA."""
    user_agent = request.headers.get("user-agent", "")

    # For real browsers, redirect to the hub course detail page
    spa_url = f"{FRONTEND_URL}/learner/hub/{course_id}"

    if not _is_bot(user_agent):
        return RedirectResponse(url=spa_url, status_code=302)

    # Fetch course data for OG tags
    result = await db.execute(
        select(Course).where(
            Course.id == course_id,
            Course.is_public.is_(True),
            Course.is_deleted.is_(False),
        )
    )
    course = result.scalar_one_or_none()

    if not course:
        return HTMLResponse(
            content=_build_og_html(
                title="Course Not Found — Learner Verse",
                description="This course is no longer available.",
                image=None,
                url=spa_url,
            )
        )

    # Creator name
    creator_result = await db.execute(
        select(User.display_name).where(User.id == course.user_id)
    )
    creator_name = creator_result.scalar_one_or_none() or "Unknown Creator"

    # Stats
    lesson_count_result = await db.execute(
        select(func.count(Lesson.id)).where(
            Lesson.section_id.in_(
                select(Section.id).where(Section.course_id == course_id)
            )
        )
    )
    lesson_count = lesson_count_result.scalar_one()

    enrollment_result = await db.execute(
        select(func.count(CourseEnrollment.id)).where(
            CourseEnrollment.course_id == course_id
        )
    )
    enrollment_count = enrollment_result.scalar_one()

    rating_result = await db.execute(
        select(
            func.coalesce(func.avg(CourseRating.rating), 0),
            func.count(CourseRating.id),
        ).where(CourseRating.course_id == course_id)
    )
    avg_rating, rating_count = rating_result.one()
    avg_rating = round(float(avg_rating), 1)

    # Build description
    desc_parts = []
    if course.description:
        desc_parts.append(course.description[:200])
    desc_parts.append(f"By {creator_name}")
    desc_parts.append(f"{lesson_count} lessons")
    if enrollment_count > 0:
        desc_parts.append(f"{enrollment_count} enrolled")
    if rating_count > 0:
        desc_parts.append(f"★ {avg_rating} ({rating_count} ratings)")

    description = " · ".join(desc_parts)

    return HTMLResponse(
        content=_build_og_html(
            title=f"{course.title} — Learner Verse",
            description=description,
            image=course.thumbnail_url,
            url=spa_url,
            course_title=course.title,
            creator=creator_name,
        )
    )


def _build_og_html(
    *,
    title: str,
    description: str,
    image: str | None,
    url: str,
    course_title: str | None = None,
    creator: str | None = None,
) -> str:
    """Build minimal HTML with OpenGraph and Twitter Card meta tags."""
    t = _escape(title)
    d = _escape(description)
    u = _escape(url)

    image_tags = ""
    if image:
        img = _escape(image)
        image_tags = f"""
    <meta property="og:image" content="{img}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:image" content="{img}" />"""

    extra_meta = ""
    if creator:
        extra_meta += f'\n    <meta name="author" content="{_escape(creator)}" />'

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{t}</title>
    <meta name="description" content="{d}" />

    <!-- OpenGraph -->
    <meta property="og:type" content="website" />
    <meta property="og:title" content="{t}" />
    <meta property="og:description" content="{d}" />
    <meta property="og:url" content="{u}" />
    <meta property="og:site_name" content="Learner Verse" />{image_tags}

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="{t}" />
    <meta name="twitter:description" content="{d}" />{extra_meta}

    <!-- Redirect for JavaScript-enabled browsers -->
    <meta http-equiv="refresh" content="0;url={u}" />
</head>
<body>
    <p>Redirecting to <a href="{u}">{t}</a>...</p>
</body>
</html>"""
