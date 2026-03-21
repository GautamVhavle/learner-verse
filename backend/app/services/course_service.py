"""Service for course lifecycle management.

Handles creation, listing, updates, soft-deletion/restoration,
duplication, content validation, and draft/ready status transitions.
"""

import uuid

from fastapi import HTTPException, status
from sqlalchemy import case, distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lesson import Lesson
from app.models.section import Section
from app.repositories.course_repo import CourseRepository
from app.repositories.section_repo import SectionRepository
from app.schemas.course import (
    CourseCreate,
    CourseListResponse,
    CourseResponse,
    CourseUpdate,
    StatusUpdateResponse,
    ValidationError,
)

MAX_COURSES_PER_USER = 50


class CourseService:
    """Business logic for course CRUD, validation, and lifecycle transitions."""

    def __init__(self, db: AsyncSession):
        self.repo = CourseRepository(db)
        self.section_repo = SectionRepository(db)
        self.db = db

    # ── CRUD ─────────────────────────────────────────────────

    async def create_course(self, user_id: uuid.UUID, data: CourseCreate) -> CourseResponse:
        """Create a new course, enforcing the per-user course limit."""
        count = await self.repo.count_active(user_id)
        if count >= MAX_COURSES_PER_USER:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Maximum of {MAX_COURSES_PER_USER} courses reached.",
            )

        course = await self.repo.create(
            user_id=user_id,
            title=data.title,
            description=data.description,
            thumbnail_url=data.thumbnail_url,
            goal_date=data.goal_date,
        )

        if data.tags:
            await self.repo.set_tags(course, data.tags, user_id)

        await self.db.commit()
        return await self._to_response(course)

    async def get_course(self, course_id: uuid.UUID, user_id: uuid.UUID) -> CourseResponse:
        """Fetch a single course. Raises 404 if not found or not owned by user."""
        course = await self.repo.get_by_id(course_id, user_id)
        if not course:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")
        return await self._to_response(course)

    async def _to_response(self, course) -> CourseResponse:
        """Build a full CourseResponse with computed section/lesson counts."""
        # Ensure server-generated timestamps are fresh
        await self.db.refresh(course, attribute_names=["updated_at", "created_at"])
        from app.models.reference_link import ReferenceLink

        # Subquery for per-section lesson counts
        section_lesson_counts = (
            select(
                Section.id.label("sid"),
                func.count(Lesson.id).label("lcnt"),
            )
            .outerjoin(Lesson, Lesson.section_id == Section.id)
            .where(Section.course_id == course.id)
            .group_by(Section.id)
            .subquery()
        )
        result = await self.db.execute(
            select(
                func.count(section_lesson_counts.c.sid),
                func.coalesce(func.sum(section_lesson_counts.c.lcnt), 0),
                func.sum(
                    case((section_lesson_counts.c.lcnt == 0, 1), else_=0)
                ),
            )
        )
        section_count, lesson_count, empty_sections = result.one()
        lesson_count = int(lesson_count)
        empty_sections = int(empty_sections or 0)

        has_issues = empty_sections > 0
        if not has_issues and lesson_count > 0:
            # Check for lessons with no content (no video, no notes, no ref links)
            empty_lesson_result = await self.db.execute(
                select(func.count(Lesson.id))
                .select_from(Lesson)
                .join(Section, Section.id == Lesson.section_id)
                .outerjoin(ReferenceLink, ReferenceLink.lesson_id == Lesson.id)
                .where(
                    Section.course_id == course.id,
                    Lesson.youtube_url.is_(None),
                    Lesson.notes_markdown.is_(None),
                )
                .group_by(Lesson.id)
                .having(func.count(ReferenceLink.id) == 0)
            )
            has_issues = empty_lesson_result.first() is not None

        return CourseResponse(
            id=course.id,
            user_id=course.user_id,
            title=course.title,
            description=course.description,
            thumbnail_url=course.thumbnail_url,
            status=course.status,
            is_deleted=course.is_deleted,
            deleted_at=course.deleted_at,
            goal_date=course.goal_date,
            tags=[{"id": t.id, "name": t.name} for t in (course.tags or [])],
            section_count=section_count,
            lesson_count=lesson_count,
            has_issues=has_issues,
            created_at=course.created_at,
            updated_at=course.updated_at,
        )

    async def list_courses(
        self,
        user_id: uuid.UUID,
        *,
        status_filter: str | None = None,
        is_deleted: bool = False,
        search: str | None = None,
    ) -> CourseListResponse:
        """Return a filtered list of courses with computed stats."""
        courses = await self.repo.list_courses(
            user_id, status=status_filter, is_deleted=is_deleted, search=search
        )
        if not courses:
            return CourseListResponse(items=[], total=0)

        # Batch-load all sections in one query instead of N+1
        sections_map = await self.section_repo.list_by_courses([c.id for c in courses])

        items = []
        for c in courses:
            sections = sections_map.get(c.id, [])
            section_count = len(sections)
            lesson_count = sum(len(s.lessons) for s in sections)
            errors = self._validate_sections(sections)
            resp = CourseResponse.model_validate(c)
            items.append(
                resp.model_copy(
                    update={
                        "section_count": section_count,
                        "lesson_count": lesson_count,
                        "has_issues": len(errors) > 0,
                    }
                )
            )
        return CourseListResponse(items=items, total=len(items))

    async def list_enrolled_courses(self, user_id: uuid.UUID) -> CourseListResponse:
        """Return all courses the user has enrolled in, with computed stats."""
        from app.repositories.enrollment_repo import get_enrolled_courses

        courses = await get_enrolled_courses(self.db, user_id=user_id)
        if not courses:
            return CourseListResponse(items=[], total=0)

        # Batch-load all sections in one query instead of N+1
        sections_map = await self.section_repo.list_by_courses([c.id for c in courses])

        items = []
        for c in courses:
            sections = sections_map.get(c.id, [])
            section_count = len(sections)
            lesson_count = sum(len(s.lessons) for s in sections)
            resp = CourseResponse.model_validate(c)
            items.append(
                resp.model_copy(
                    update={
                        "section_count": section_count,
                        "lesson_count": lesson_count,
                        "has_issues": len(self._validate_sections(sections)) > 0,
                    }
                )
            )
        return CourseListResponse(items=items, total=len(items))

    async def update_course(
        self, course_id: uuid.UUID, user_id: uuid.UUID, data: CourseUpdate
    ) -> CourseResponse:
        """Apply partial updates to a course. Cannot update deleted courses."""
        course = await self.repo.get_by_id(course_id, user_id)
        if not course:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")
        if course.is_deleted:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot update a deleted course."
            )

        update_fields = data.model_dump(exclude_unset=True, exclude={"tags"})
        if update_fields:
            await self.repo.update(course, **update_fields)

        if data.tags is not None:
            await self.repo.set_tags(course, data.tags, user_id)

        await self.db.commit()
        return await self._to_response(course)

    async def soft_delete(self, course_id: uuid.UUID, user_id: uuid.UUID) -> CourseResponse:
        """Move a course to the trash (soft-delete)."""
        course = await self.repo.get_by_id(course_id, user_id)
        if not course:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")
        if course.is_deleted:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Course is already deleted."
            )
        course = await self.repo.soft_delete(course)
        await self.db.commit()
        return await self._to_response(course)

    async def restore(self, course_id: uuid.UUID, user_id: uuid.UUID) -> CourseResponse:
        """Restore a course from the trash."""
        course = await self.repo.get_by_id(course_id, user_id)
        if not course:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")
        if not course.is_deleted:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Course is not deleted."
            )
        course = await self.repo.restore(course)
        await self.db.commit()
        return await self._to_response(course)

    async def permanent_delete(self, course_id: uuid.UUID, user_id: uuid.UUID) -> None:
        """Permanently delete a trashed course. Must be soft-deleted first."""
        course = await self.repo.get_by_id(course_id, user_id)
        if not course:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")
        if not course.is_deleted:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Course must be in trash before permanent deletion.",
            )
        await self.repo.permanent_delete(course)
        await self.db.commit()

    # ── Duplication ──────────────────────────────────────────

    async def duplicate(self, course_id: uuid.UUID, user_id: uuid.UUID) -> CourseResponse:
        """Deep-copy a course including all sections, lessons, and reference links."""
        course = await self.repo.get_by_id(course_id, user_id)
        if not course:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")

        count = await self.repo.count_active(user_id)
        if count >= MAX_COURSES_PER_USER:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Maximum of {MAX_COURSES_PER_USER} courses reached.",
            )

        new_course = await self.repo.duplicate(course, user_id)

        # Deep-copy all sections (includes lessons + reference links)
        sections = await self.section_repo.list_by_course(course_id)
        for section in sections:
            await self.section_repo.duplicate_to_course(section, new_course.id)

        await self.db.commit()
        return await self._to_response(new_course)

    # ── Validation & Status ──────────────────────────────────

    @staticmethod
    def _validate_sections(sections) -> list[ValidationError]:
        """Check that every section has lessons and every lesson has content."""
        errors: list[ValidationError] = []
        for section in sections:
            if not section.lessons:
                errors.append(
                    ValidationError(
                        section=section.title,
                        message="Section has no lessons.",
                    )
                )
                continue
            for lesson in section.lessons:
                has_content = bool(
                    lesson.youtube_url
                    or lesson.notes_markdown
                    or lesson.reference_links
                )
                if not has_content:
                    errors.append(
                        ValidationError(
                            section=section.title,
                            lesson=lesson.title,
                            message="Lesson has no content (video, notes, or links).",
                        )
                    )
        return errors

    async def validate_course(
        self, course_id: uuid.UUID, user_id: uuid.UUID
    ) -> list[ValidationError]:
        """Run full content validation on a course. Returns a list of errors."""
        course = await self.repo.get_by_id(course_id, user_id)
        if not course:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")
        sections = await self.section_repo.list_by_course(course_id)
        if not sections:
            return [
                ValidationError(section="(none)", message="Course has no sections.")
            ]
        return self._validate_sections(sections)

    async def update_status(
        self, course_id: uuid.UUID, user_id: uuid.UUID, new_status: str
    ) -> StatusUpdateResponse:
        """Transition a course's status. Validates content when moving to 'ready'."""
        course = await self.repo.get_by_id(course_id, user_id)
        if not course:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")
        if course.is_deleted:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot update a deleted course."
            )

        if new_status == "ready":
            errors = await self.validate_course(course_id, user_id)
            if errors:
                return StatusUpdateResponse(status=course.status, valid=False, errors=errors)

        await self.repo.update(course, status=new_status)
        await self.db.commit()
        return StatusUpdateResponse(status=new_status, valid=True, errors=[])
