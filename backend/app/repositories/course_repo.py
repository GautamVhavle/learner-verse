"""Repository for Course CRUD, tagging, soft-deletion, and duplication."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.course import Course
from app.models.tag import Tag


class CourseRepository:
    """Data-access layer for courses and their tag associations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ── CRUD ─────────────────────────────────────────────────

    # ── CRUD ─────────────────────────────────────────────────

    async def create(self, user_id: uuid.UUID, title: str, **kwargs) -> Course:
        """Create a new course for a user."""
        course = Course(user_id=user_id, title=title, **kwargs)
        self.db.add(course)
        await self.db.flush()
        # Initialize tags relationship to avoid lazy-load in async context
        await self.db.refresh(course, attribute_names=["tags"])
        return course

    async def get_by_id(self, course_id: uuid.UUID, user_id: uuid.UUID) -> Course | None:
        """Fetch a course by ID with tags eagerly loaded (single JOIN). Returns None if not owned by user."""
        result = await self.db.execute(
            select(Course)
            .options(joinedload(Course.tags))
            .where(Course.id == course_id, Course.user_id == user_id)
        )
        return result.unique().scalar_one_or_none()

    async def get_by_id_no_owner(self, course_id: uuid.UUID) -> Course | None:
        """Fetch a non-deleted course by ID without ownership check (for enrolled users)."""
        result = await self.db.execute(
            select(Course)
            .options(joinedload(Course.tags))
            .where(Course.id == course_id, Course.is_deleted.is_(False))
        )
        return result.unique().scalar_one_or_none()

    async def list_courses(
        self,
        user_id: uuid.UUID,
        *,
        status: str | None = None,
        is_deleted: bool = False,
        search: str | None = None,
    ) -> list[Course]:
        """List courses for a user with optional status/search filters."""
        query = (
            select(Course)
            .options(joinedload(Course.tags))
            .where(Course.user_id == user_id, Course.is_deleted == is_deleted)
            .order_by(Course.updated_at.desc())
        )
        if status:
            query = query.where(Course.status == status)
        if search:
            query = query.where(Course.title.ilike(f"%{search}%"))

        result = await self.db.execute(query)
        return list(result.unique().scalars().all())

    async def count_active(self, user_id: uuid.UUID) -> int:
        """Count non-deleted courses belonging to a user."""
        result = await self.db.execute(
            select(func.count(Course.id)).where(
                Course.user_id == user_id, Course.is_deleted == False  # noqa: E712
            )
        )
        return result.scalar_one()

    # ── Public (Hub) Queries ──────────────────────────────────

    async def list_public_courses(
        self,
        *,
        search: str | None = None,
        tags: list[str] | None = None,
        sort_by: str = "newest",
        page: int = 1,
        per_page: int = 20,
    ) -> tuple[list[Course], int]:
        """Return paginated public courses with filtering and sorting."""
        from app.models.tag import Tag as TagModel, course_tags

        base = (
            select(Course)
            .options(joinedload(Course.tags))
            .where(
                Course.is_public.is_(True),
                Course.status == "ready",
                Course.is_deleted.is_(False),
            )
        )
        count_q = (
            select(func.count(Course.id))
            .where(
                Course.is_public.is_(True),
                Course.status == "ready",
                Course.is_deleted.is_(False),
            )
        )

        if search:
            pattern = f"%{search}%"
            base = base.where(
                Course.title.ilike(pattern) | Course.description.ilike(pattern)
            )
            count_q = count_q.where(
                Course.title.ilike(pattern) | Course.description.ilike(pattern)
            )

        if tags:
            clean_tags = [t.strip().lower() for t in tags if t.strip()]
            if clean_tags:
                base = base.join(course_tags).join(TagModel).where(TagModel.name.in_(clean_tags))
                count_q = (
                    count_q.join(course_tags, course_tags.c.course_id == Course.id)
                    .join(TagModel, TagModel.id == course_tags.c.tag_id)
                    .where(TagModel.name.in_(clean_tags))
                )

        if sort_by == "oldest":
            base = base.order_by(Course.created_at.asc())
        elif sort_by == "title":
            base = base.order_by(Course.title.asc())
        else:  # newest (default)
            base = base.order_by(Course.created_at.desc())

        offset = (page - 1) * per_page
        base = base.offset(offset).limit(per_page)

        result = await self.db.execute(base)
        courses = list(result.unique().scalars().all())

        count_result = await self.db.execute(count_q)
        total = count_result.scalar_one()

        return courses, total

    async def get_public_by_id(self, course_id: uuid.UUID) -> Course | None:
        """Fetch a single public course by ID."""
        result = await self.db.execute(
            select(Course)
            .options(joinedload(Course.tags))
            .where(
                Course.id == course_id,
                Course.is_public.is_(True),
                Course.status == "ready",
                Course.is_deleted.is_(False),
            )
        )
        return result.unique().scalar_one_or_none()

    async def update(self, course: Course, **kwargs) -> Course:
        """Apply partial field updates to an existing course."""
        for key, value in kwargs.items():
            if hasattr(course, key):
                setattr(course, key, value)
        await self.db.flush()
        return course

    # ── Soft Deletion ─────────────────────────────────────────

    async def soft_delete(self, course: Course) -> Course:
        """Mark a course as deleted (move to trash)."""
        course.is_deleted = True
        course.deleted_at = datetime.now(timezone.utc)
        await self.db.flush()
        return course

    async def restore(self, course: Course) -> Course:
        """Restore a soft-deleted course from trash."""
        course.is_deleted = False
        course.deleted_at = None
        await self.db.flush()
        return course

    async def permanent_delete(self, course: Course) -> None:
        """Permanently remove a course from the database."""
        await self.db.delete(course)
        await self.db.flush()

    # ── Tagging ─────────────────────────────────────────────

    async def set_tags(self, course: Course, tag_names: list[str], user_id: uuid.UUID) -> None:
        """Sync course tags: resolve names → Tag objects, assign to course."""
        if not tag_names:
            course.tags = []
            await self.db.flush()
            return

        tags = []
        for name in tag_names:
            clean_name = name.strip().lower()
            if not clean_name:
                continue
            result = await self.db.execute(
                select(Tag).where(Tag.user_id == user_id, Tag.name == clean_name)
            )
            tag = result.scalar_one_or_none()
            if tag is None:
                tag = Tag(user_id=user_id, name=clean_name)
                self.db.add(tag)
                await self.db.flush()
            tags.append(tag)

        course.tags = tags
        await self.db.flush()

    # ── Duplication ─────────────────────────────────────────

    async def duplicate(self, course: Course, user_id: uuid.UUID) -> Course:
        """Create a shallow copy of a course (metadata + tags only, no sections)."""
        # Re-fetch to ensure all attributes and tags are fully loaded
        result = await self.db.execute(
            select(Course)
            .options(joinedload(Course.tags))
            .where(Course.id == course.id)
        )
        source = result.unique().scalar_one()
        tag_objects = list(source.tags) if source.tags else []

        new_course = Course(
            user_id=user_id,
            title=f"{source.title} (Copy)",
            description=source.description,
            thumbnail_url=source.thumbnail_url,
            status="draft",
            goal_date=source.goal_date,
            tags=tag_objects,
        )
        self.db.add(new_course)
        await self.db.flush()

        return new_course
