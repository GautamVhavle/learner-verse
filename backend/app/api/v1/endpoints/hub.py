"""API endpoints for the public Course Hub — discovery, ratings, and enrollment."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.repositories import enrollment_repo
from app.repositories.course_repo import CourseRepository
from app.repositories.rating_repo import RatingRepository
from app.repositories.section_repo import SectionRepository
from app.schemas.course import CourseListResponse, CourseResponse
from app.schemas.rating import RatingCreate, RatingListResponse, RatingResponse, RatingUpdate


router = APIRouter(prefix="/hub", tags=["hub"])


# ── Public Course Listing ──────────────────────────────────────

@router.get("/courses", response_model=CourseListResponse)
async def list_hub_courses(
    search: str | None = Query(None, max_length=200),
    tags: str | None = Query(None, max_length=500, description="Comma-separated tag names"),
    sort: str = Query("newest", pattern=r"^(newest|oldest|title)$"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List public courses with search, tag filters, and sorting."""
    repo = CourseRepository(db)
    rating_repo = RatingRepository(db)
    section_repo = SectionRepository(db)

    tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else None
    courses, total = await repo.list_public_courses(
        search=search, tags=tag_list, sort_by=sort, page=page, per_page=per_page,
    )

    if not courses:
        return CourseListResponse(items=[], total=0)

    course_ids = [c.id for c in courses]
    user_ids = list({c.user_id for c in courses})

    # Batch load stats
    sections_map = await section_repo.list_by_courses(course_ids)
    rating_stats = await rating_repo.get_stats_batch(course_ids)
    enrollment_counts = await enrollment_repo.get_enrollment_counts_batch(db, course_ids=course_ids)

    # Batch load creator names
    from sqlalchemy import select
    from app.models.user import User as UserModel
    result = await db.execute(
        select(UserModel.id, UserModel.display_name).where(UserModel.id.in_(user_ids))
    )
    creator_names = {row[0]: row[1] for row in result.all()}

    items = []
    for c in courses:
        sections = sections_map.get(c.id, [])
        section_count = len(sections)
        lesson_count = sum(len(s.lessons) for s in sections)
        avg, r_count = rating_stats.get(c.id, (0.0, 0))
        e_count = enrollment_counts.get(c.id, 0)

        items.append(CourseResponse(
            id=c.id,
            user_id=c.user_id,
            title=c.title,
            description=c.description,
            thumbnail_url=c.thumbnail_url,
            status=c.status,
            is_public=c.is_public,
            is_deleted=c.is_deleted,
            deleted_at=c.deleted_at,
            goal_date=c.goal_date,
            tags=[{"id": t.id, "name": t.name} for t in (c.tags or [])],
            section_count=section_count,
            lesson_count=lesson_count,
            has_issues=False,
            enrollment_count=e_count,
            average_rating=avg,
            rating_count=r_count,
            creator_name=creator_names.get(c.user_id, ""),
            created_at=c.created_at,
            updated_at=c.updated_at,
        ))

    return CourseListResponse(items=items, total=total)


# ── My Courses (Private View) ─────────────────────────────────

@router.get("/my-courses", response_model=CourseListResponse)
async def list_my_courses(
    search: str | None = Query(None, max_length=200),
    sort: str = Query("newest", pattern=r"^(newest|oldest|title)$"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List the current user's own courses (all statuses) with hub-style stats."""
    repo = CourseRepository(db)
    rating_repo = RatingRepository(db)
    section_repo = SectionRepository(db)

    all_courses = await repo.list_courses(user.id, search=search)

    # Sort
    if sort == "oldest":
        all_courses.sort(key=lambda c: c.created_at)
    elif sort == "title":
        all_courses.sort(key=lambda c: c.title.lower())
    else:
        all_courses.sort(key=lambda c: c.created_at, reverse=True)

    total = len(all_courses)
    start = (page - 1) * per_page
    courses = all_courses[start : start + per_page]

    if not courses:
        return CourseListResponse(items=[], total=total)

    course_ids = [c.id for c in courses]
    sections_map = await section_repo.list_by_courses(course_ids)
    rating_stats = await rating_repo.get_stats_batch(course_ids)
    enrollment_counts = await enrollment_repo.get_enrollment_counts_batch(db, course_ids=course_ids)

    items = []
    for c in courses:
        sections = sections_map.get(c.id, [])
        section_count = len(sections)
        lesson_count = sum(len(s.lessons) for s in sections)
        avg, r_count = rating_stats.get(c.id, (0.0, 0))
        e_count = enrollment_counts.get(c.id, 0)

        items.append(CourseResponse(
            id=c.id,
            user_id=c.user_id,
            title=c.title,
            description=c.description,
            thumbnail_url=c.thumbnail_url,
            status=c.status,
            is_public=c.is_public,
            is_deleted=c.is_deleted,
            deleted_at=c.deleted_at,
            goal_date=c.goal_date,
            tags=[{"id": t.id, "name": t.name} for t in (c.tags or [])],
            section_count=section_count,
            lesson_count=lesson_count,
            has_issues=False,
            enrollment_count=e_count,
            average_rating=avg,
            rating_count=r_count,
            creator_name=user.display_name,
            created_at=c.created_at,
            updated_at=c.updated_at,
        ))

    return CourseListResponse(items=items, total=total)


@router.get("/courses/{course_id}", response_model=CourseResponse)
async def get_hub_course(
    course_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a course the user can access: public+ready, enrolled, or owned."""
    repo = CourseRepository(db)
    rating_repo = RatingRepository(db)
    section_repo = SectionRepository(db)

    # Try public first, then owner/enrolled fallback
    course = await repo.get_public_by_id(course_id)
    if not course:
        course = await repo.get_by_id(course_id, user.id)
    if not course:
        enrolled = await enrollment_repo.is_enrolled(db, user_id=user.id, course_id=course_id)
        if enrolled:
            course = await repo.get_by_id_no_owner(course_id)
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")

    sections = await section_repo.list_by_course(course_id)
    section_count = len(sections)
    lesson_count = sum(len(s.lessons) for s in sections)
    avg, r_count = await rating_repo.get_stats(course_id)
    e_count = await enrollment_repo.get_enrollment_count(db, course_id=course_id)

    # Creator name
    from sqlalchemy import select
    from app.models.user import User as UserModel
    result = await db.execute(
        select(UserModel.display_name).where(UserModel.id == course.user_id)
    )
    creator_name = result.scalar_one_or_none() or ""

    return CourseResponse(
        id=course.id,
        user_id=course.user_id,
        title=course.title,
        description=course.description,
        thumbnail_url=course.thumbnail_url,
        status=course.status,
        is_public=course.is_public,
        is_deleted=course.is_deleted,
        deleted_at=course.deleted_at,
        goal_date=course.goal_date,
        tags=[{"id": t.id, "name": t.name} for t in (course.tags or [])],
        section_count=section_count,
        lesson_count=lesson_count,
        has_issues=False,
        enrollment_count=e_count,
        average_rating=avg,
        rating_count=r_count,
        creator_name=creator_name,
        created_at=course.created_at,
        updated_at=course.updated_at,
    )


# ── Accessible Sections ───────────────────────────────────────

@router.get("/courses/{course_id}/sections")
async def list_hub_sections(
    course_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return sections for a course the user can access (owned, enrolled, or public+ready)."""
    repo = CourseRepository(db)
    section_repo = SectionRepository(db)

    # Check access: public, owned, or enrolled
    course = await repo.get_public_by_id(course_id)
    if not course:
        course = await repo.get_by_id(course_id, user.id)
    if not course:
        enrolled = await enrollment_repo.is_enrolled(db, user_id=user.id, course_id=course_id)
        if enrolled:
            course = await repo.get_by_id_no_owner(course_id)
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")

    sections = await section_repo.list_by_course(course_id)
    from app.schemas.section import SectionResponse
    return [SectionResponse.model_validate(s) for s in sections]


# ── Ratings ────────────────────────────────────────────────────

@router.post("/courses/{course_id}/ratings", response_model=RatingResponse, status_code=status.HTTP_201_CREATED)
async def create_rating(
    course_id: uuid.UUID,
    data: RatingCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit a rating for a public course. One rating per user per course."""
    repo = CourseRepository(db)
    course = await repo.get_public_by_id(course_id)
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")

    rating_repo = RatingRepository(db)
    existing = await rating_repo.get_by_user_course(user.id, course_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already rated this course.",
        )

    obj = await rating_repo.create(user.id, course_id, data.rating, data.review)
    await db.commit()
    await db.refresh(obj, attribute_names=["user"])
    return _to_rating_response(obj)


@router.get("/courses/{course_id}/ratings", response_model=RatingListResponse)
async def list_ratings(
    course_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all ratings for a public course."""
    rating_repo = RatingRepository(db)
    items = await rating_repo.list_by_course(course_id)
    avg, count = await rating_repo.get_stats(course_id)
    return RatingListResponse(
        items=[_to_rating_response(r) for r in items],
        total=count,
        average=avg,
    )


@router.put("/courses/{course_id}/ratings", response_model=RatingResponse)
async def update_rating(
    course_id: uuid.UUID,
    data: RatingUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update your own rating for a course."""
    rating_repo = RatingRepository(db)
    existing = await rating_repo.get_by_user_course(user.id, course_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rating not found.")

    updates = data.model_dump(exclude_unset=True)
    if updates:
        await rating_repo.update(existing, **updates)
    await db.commit()
    await db.refresh(existing, attribute_names=["user"])
    return _to_rating_response(existing)


@router.delete("/courses/{course_id}/ratings", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rating(
    course_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete your own rating for a course."""
    rating_repo = RatingRepository(db)
    deleted = await rating_repo.delete(user.id, course_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rating not found.")
    await db.commit()


def _to_rating_response(obj) -> RatingResponse:
    """Convert a CourseRating ORM object to a response schema."""
    return RatingResponse(
        id=obj.id,
        user_id=obj.user_id,
        course_id=obj.course_id,
        rating=obj.rating,
        review=obj.review,
        user_name=obj.user.display_name if obj.user else "",
        user_avatar=obj.user.avatar_url if obj.user else None,
        created_at=obj.created_at,
        updated_at=obj.updated_at,
    )
