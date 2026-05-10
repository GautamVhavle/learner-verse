"""Public shareable link endpoint - serves OpenGraph HTML for social previews."""

import uuid

from fastapi import APIRouter, Depends
from fastapi.responses import HTMLResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.core.config import settings
from app.core.database import get_db
from app.models.certificate import Certificate
from app.models.course import Course
from app.models.enrollment import CourseEnrollment
from app.models.lesson import Lesson
from app.models.rating import CourseRating
from app.models.section import Section
from app.models.user import User
from app.services.stats_service import StatsService

router = APIRouter(prefix="/share", tags=["share"])


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


def _truncate(text: str, limit: int) -> str:
    if len(text) <= limit:
        return text
    return text[: max(0, limit - 3)].rstrip() + "..."


@router.get("/course/{course_id}")
async def share_course(
    course_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Serve OpenGraph HTML with a meta refresh to the public course page."""
    frontend_base = settings.FRONTEND_URL.rstrip("/")
    canonical_url = f"{frontend_base}/courses/{course_id}"
    course_url = canonical_url

    # Fetch course data for OG tags
    result = await db.execute(
        select(Course)
        .options(joinedload(Course.tags))
        .where(
            Course.id == course_id,
            Course.is_public.is_(True),
            Course.status == "ready",
            Course.is_deleted.is_(False),
        )
    )
    course = result.unique().scalar_one_or_none()

    if not course:
        return HTMLResponse(
            content=_build_og_html(
                title="Course Not Found - Learner Verse",
                description="This course is no longer available.",
                image=settings.DEFAULT_OG_IMAGE_URL or None,
                url=canonical_url,
                redirect_url=course_url,
            )
        )

    # Creator name
    creator_result = await db.execute(select(User.display_name).where(User.id == course.user_id))
    creator_name = creator_result.scalar_one_or_none() or "Unknown Creator"

    # Stats
    lesson_count_result = await db.execute(
        select(func.count(Lesson.id)).where(
            Lesson.section_id.in_(select(Section.id).where(Section.course_id == course_id))
        )
    )
    lesson_count = lesson_count_result.scalar_one()

    enrollment_result = await db.execute(
        select(func.count(CourseEnrollment.id)).where(CourseEnrollment.course_id == course_id)
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

    tag_names = [t.name for t in (course.tags or [])]
    tag_preview = ", ".join(tag_names[:4])
    if len(tag_names) > 4:
        tag_preview = f"{tag_preview} +{len(tag_names) - 4}"

    # Build description
    desc_parts = []
    if course.description:
        desc_parts.append(_truncate(course.description.strip(), 180))
    desc_parts.append(f"By {creator_name}")
    desc_parts.append(f"{lesson_count} lessons")
    if enrollment_count > 0:
        desc_parts.append(f"{enrollment_count} enrolled")
    if rating_count > 0:
        desc_parts.append(f"★ {avg_rating} ({rating_count} ratings)")
    if tag_preview:
        desc_parts.append(f"Tags: {tag_preview}")

    description = _truncate(" · ".join(desc_parts), 240)
    image = course.thumbnail_url or settings.DEFAULT_OG_IMAGE_URL or None

    return HTMLResponse(
        content=_build_og_html(
            title=f"{course.title} - Learner Verse",
            description=description,
            image=image,
            url=canonical_url,
            redirect_url=course_url,
            creator=creator_name,
            tags=tag_names,
        )
    )


@router.get("/profile/{user_id}")
async def share_profile(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Serve OpenGraph HTML with a meta refresh to the public profile page."""
    frontend_base = settings.FRONTEND_URL.rstrip("/")
    canonical_url = f"{frontend_base}/profile/{user_id}"

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user or not user.is_profile_public:
        return HTMLResponse(
            content=_build_og_html(
                title="Profile Not Found - LearnerVerse",
                description="This profile is not available or is set to private.",
                image=settings.DEFAULT_OG_IMAGE_URL or None,
                url=canonical_url,
                redirect_url=canonical_url,
            )
        )

    # Stats
    stats_svc = StatsService(db)
    overview = await stats_svc.get_overview(user_id)

    # Certificate count
    cert_result = await db.execute(
        select(func.count(Certificate.id)).where(Certificate.user_id == user_id)
    )
    cert_count = cert_result.scalar_one()

    # Build description
    desc_parts: list[str] = []
    if user.bio:
        desc_parts.append(_truncate(user.bio.strip(), 160))
    desc_parts.append(f"{overview.total_courses_completed} courses completed")
    desc_parts.append(f"{overview.total_lessons_completed} lessons completed")
    if cert_count > 0:
        desc_parts.append(f"{cert_count} certificate{'s' if cert_count != 1 else ''} earned")
    if overview.current_streak > 0:
        desc_parts.append(f"{overview.current_streak}-day streak")
    if user.is_verified_creator:
        desc_parts.append("Verified Creator")

    description = _truncate(" · ".join(desc_parts), 240)
    image = user.avatar_url or settings.DEFAULT_OG_IMAGE_URL or None
    profile_tags = user.profile_tags or []

    return HTMLResponse(
        content=_build_og_html(
            title=f"{user.display_name} - LearnerVerse",
            description=description,
            image=image,
            url=canonical_url,
            redirect_url=canonical_url,
            og_type="profile",
            twitter_card="summary",
            tags=profile_tags,
        )
    )


@router.get("/certificate/{certificate_uid}")
async def share_certificate(
    certificate_uid: str,
    db: AsyncSession = Depends(get_db),
):
    """Serve OpenGraph HTML with a meta refresh to the certificate share page."""
    frontend_base = settings.FRONTEND_URL.rstrip("/")
    canonical_url = f"{frontend_base}/certificates/share/{certificate_uid}"

    result = await db.execute(
        select(Certificate)
        .options(selectinload(Certificate.course))
        .where(Certificate.certificate_uid == certificate_uid)
    )
    cert = result.scalar_one_or_none()

    if not cert:
        return HTMLResponse(
            content=_build_og_html(
                title="Certificate Not Found - LearnerVerse",
                description="This certificate could not be found.",
                image=settings.DEFAULT_OG_IMAGE_URL or None,
                url=canonical_url,
                redirect_url=canonical_url,
            )
        )

    # Use course thumbnail as the OG image
    course_thumbnail = cert.course.thumbnail_url if cert.course else None
    image = course_thumbnail or settings.DEFAULT_OG_IMAGE_URL or None

    # Fetch course creator info
    creator_name: str | None = None
    if cert.course:
        creator_result = await db.execute(
            select(User.display_name).where(User.id == cert.course.user_id)
        )
        creator_name = creator_result.scalar_one_or_none()

    # Build description
    completed_date = cert.completed_at.strftime("%B %d, %Y")
    desc_parts = [
        f'Awarded to {cert.user_name} for completing "{cert.course_title}"',
    ]
    if creator_name:
        desc_parts.append(f"Course by {creator_name}")
    desc_parts.append(f"Completed on {completed_date}")
    desc_parts.append(
        f"{cert.sections_count} section{'s' if cert.sections_count != 1 else ''}"
        f", {cert.lessons_count} lesson{'s' if cert.lessons_count != 1 else ''}"
    )
    desc_parts.append(f"ID: {cert.certificate_uid}")
    description = _truncate(" · ".join(desc_parts), 240)

    return HTMLResponse(
        content=_build_og_html(
            title=f"{cert.course_title} - Certificate · {cert.user_name} - LearnerVerse",
            description=description,
            image=image,
            url=canonical_url,
            redirect_url=canonical_url,
            creator=cert.user_name,
        )
    )


# ── HTML builder ─────────────────────────────────────────────────


def _build_og_html(
    *,
    title: str,
    description: str,
    image: str | None,
    url: str,
    redirect_url: str,
    og_type: str = "website",
    twitter_card: str = "summary_large_image",
    creator: str | None = None,
    tags: list[str] | None = None,
) -> str:
    """Build minimal HTML with OpenGraph and Twitter Card meta tags."""
    t = _escape(title)
    d = _escape(description)
    u = _escape(url)
    redirect = _escape(redirect_url)
    logo = _escape(settings.FRONTEND_URL.rstrip("/") + "/logo.png")

    image_tags = ""
    if image:
        img = _escape(image)
        image_tags = f"""
    <meta property="og:image" content="{img}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="{t}" />
    <meta name="twitter:image" content="{img}" />
    <meta name="twitter:image:alt" content="{t}" />"""

    extra_meta = ""
    if creator:
        extra_meta += f'\n    <meta name="author" content="{_escape(creator)}" />'

    tag_meta = ""
    if tags:
        clean_tags = [_escape(tag) for tag in tags if tag]
        if clean_tags:
            keywords = ", ".join(clean_tags)
            tag_meta = f'\n    <meta name="keywords" content="{keywords}" />'
            tag_meta += "".join(
                f'\n    <meta property="article:tag" content="{tag}" />' for tag in clean_tags
            )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{t}</title>
    <meta name="description" content="{d}" />
    <link rel="canonical" href="{redirect}" />

    <!-- OpenGraph -->
    <meta property="og:type" content="{_escape(og_type)}" />
    <meta property="og:title" content="{t}" />
    <meta property="og:description" content="{d}" />
    <meta property="og:url" content="{u}" />
    <meta property="og:site_name" content="LearnerVerse" />
    <meta property="og:logo" content="{logo}" />{image_tags}{tag_meta}

    <!-- Twitter Card -->
    <meta name="twitter:card" content="{_escape(twitter_card)}" />
    <meta name="twitter:title" content="{t}" />
    <meta name="twitter:description" content="{d}" />{extra_meta}

    <!-- Redirect for JavaScript-enabled browsers -->
    <meta http-equiv="refresh" content="0;url={redirect}" />
</head>
<body>
    <p>Redirecting to <a href="{redirect}">{t}</a>...</p>
</body>
</html>"""
