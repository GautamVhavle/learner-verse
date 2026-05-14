"""Service for course lifecycle management.

Handles creation, listing, updates, soft-deletion/restoration,
duplication, content validation, and draft/ready status transitions.
"""

import uuid

from fastapi import HTTPException, status
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lesson import Lesson
from app.models.quiz_question import QuizQuestion
from app.models.section import Section
from app.repositories.course_repo import CourseRepository
from app.repositories.rating_repo import RatingRepository
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
        self.rating_repo = RatingRepository(db)
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
            category=data.category,
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
                func.sum(case((section_lesson_counts.c.lcnt == 0, 1), else_=0)),
            )
        )
        section_count, lesson_count, empty_sections = result.one()
        lesson_count = int(lesson_count)
        empty_sections = int(empty_sections or 0)

        has_issues = empty_sections > 0
        if not has_issues and lesson_count > 0:
            # Check for non-quiz lessons with no content (no video, no notes, no ref links)
            # Quiz lessons are excluded - their content lives in quiz_questions
            empty_lesson_result = await self.db.execute(
                select(func.count(Lesson.id))
                .select_from(Lesson)
                .join(Section, Section.id == Lesson.section_id)
                .outerjoin(ReferenceLink, ReferenceLink.lesson_id == Lesson.id)
                .where(
                    Section.course_id == course.id,
                    Lesson.lesson_type != "quiz",
                    Lesson.youtube_url.is_(None),
                    Lesson.notes_markdown.is_(None),
                )
                .group_by(Lesson.id)
                .having(func.count(ReferenceLink.id) == 0)
            )
            has_issues = empty_lesson_result.first() is not None

            # Also flag quiz lessons that have zero questions
            if not has_issues:
                empty_quiz_result = await self.db.execute(
                    select(func.count(Lesson.id))
                    .select_from(Lesson)
                    .join(Section, Section.id == Lesson.section_id)
                    .outerjoin(QuizQuestion, QuizQuestion.lesson_id == Lesson.id)
                    .where(
                        Section.course_id == course.id,
                        Lesson.lesson_type == "quiz",
                    )
                    .group_by(Lesson.id)
                    .having(func.count(QuizQuestion.id) == 0)
                )
                has_issues = empty_quiz_result.first() is not None

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
            category=course.category,
            goal_date=course.goal_date,
            tags=[{"id": t.id, "name": t.name} for t in (course.tags or [])],
            section_count=section_count,
            lesson_count=lesson_count,
            has_issues=has_issues,
            enrollment_count=0,
            average_rating=0.0,
            rating_count=0,
            creator_name="",
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
        from app.repositories.enrollment_repo import EnrollmentRepository

        courses = await EnrollmentRepository(self.db).get_enrolled_courses(user_id)
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
        if update_fields.get("is_public") is True and course.status != "ready":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only published courses can be made public.",
            )
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
                if lesson.lesson_type == "quiz":
                    if not lesson.quiz_questions:
                        errors.append(
                            ValidationError(
                                section=section.title,
                                lesson=lesson.title,
                                message="Quiz has no questions.",
                            )
                        )
                else:
                    has_content = bool(
                        lesson.youtube_url or lesson.notes_markdown or lesson.reference_links
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
            return [ValidationError(section="(none)", message="Course has no sections.")]
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

        update_kwargs: dict = {"status": new_status}
        # Clear is_public when moving back to draft to prevent
        # surprise re-publication when the course is later re-published.
        if new_status == "draft" and course.is_public:
            update_kwargs["is_public"] = False

        await self.repo.update(course, **update_kwargs)
        await self.db.commit()
        return StatusUpdateResponse(status=new_status, valid=True, errors=[])

    # ── Export / Import ──────────────────────────────────────

    async def export_course(self, course_id: uuid.UUID, user_id: uuid.UUID) -> dict:
        """Build a complete JSON-serialisable export of a course."""
        course = await self.repo.get_by_id(course_id, user_id)
        if not course:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")

        sections = await self.section_repo.list_by_course(course_id)

        return {
            "format": "learnerverse-course-export",
            "version": 1,
            "course": {
                "title": course.title,
                "description": course.description,
                "status": course.status,
                "is_public": course.is_public,
                "category": course.category,
                "goal_date": str(course.goal_date) if course.goal_date else None,
                "tags": [t.name for t in (course.tags or [])],
            },
            "sections": [
                {
                    "title": section.title,
                    "description": section.description,
                    "position": section.position,
                    "lessons": [
                        {
                            "title": lesson.title,
                            "lesson_type": lesson.lesson_type or "video",
                            "position": lesson.position,
                            "youtube_url": lesson.youtube_url,
                            "youtube_title": lesson.youtube_title,
                            "youtube_thumbnail": lesson.youtube_thumbnail,
                            "youtube_duration": lesson.youtube_duration,
                            "youtube_channel": lesson.youtube_channel,
                            "notes_markdown": lesson.notes_markdown,
                            "reference_links": [
                                {
                                    "url": link.url,
                                    "title": link.title,
                                    "description": link.description,
                                    "image": link.image,
                                    "favicon": link.favicon,
                                    "domain": link.domain,
                                    "position": link.position,
                                }
                                for link in (lesson.reference_links or [])
                            ],
                            "quiz_questions": [
                                {
                                    "question": q.question,
                                    "options": list(q.options),
                                    "correct_option": q.correct_option,
                                    "position": q.position,
                                }
                                for q in (lesson.quiz_questions or [])
                            ],
                        }
                        for lesson in section.lessons
                    ],
                }
                for section in sections
            ],
        }

    async def import_course(
        self, course_id: uuid.UUID, user_id: uuid.UUID, payload: dict
    ) -> CourseResponse:
        """Validate and import a course JSON, replacing all existing content."""
        from app.models.reference_link import ReferenceLink as ReferenceLinkModel

        # --- Validate top-level structure ---
        if payload.get("format") != "learnerverse-course-export":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid export format. Expected 'learnerverse-course-export'.",
            )
        if payload.get("version") != 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported export version: {payload.get('version')}.",
            )

        course_data = payload.get("course")
        if not isinstance(course_data, dict) or not course_data.get("title"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or missing 'course' object in payload.",
            )

        sections_data = payload.get("sections")
        if not isinstance(sections_data, list):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or missing 'sections' array in payload.",
            )

        # Validate section/lesson structure
        for i, sec in enumerate(sections_data):
            if not isinstance(sec, dict) or not sec.get("title"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Section at index {i} is invalid or missing a title.",
                )
            lessons = sec.get("lessons", [])
            if not isinstance(lessons, list):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Section '{sec['title']}': 'lessons' must be an array.",
                )
            for j, les in enumerate(lessons):
                if not isinstance(les, dict) or not les.get("title"):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Section '{sec['title']}', lesson at index {j} is invalid.",
                    )
                lesson_type = les.get("lesson_type", "video")
                if lesson_type not in ("video", "note", "quiz"):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Section '{sec['title']}', lesson '{les['title']}': invalid lesson_type '{lesson_type}'.",
                    )
                # Validate quiz questions if present
                for k, q in enumerate(les.get("quiz_questions", [])):
                    if not isinstance(q, dict) or not q.get("question"):
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Lesson '{les['title']}', quiz question at index {k} is invalid.",
                        )
                    opts = q.get("options", [])
                    if not isinstance(opts, list) or len(opts) != 4:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Lesson '{les['title']}', question '{q['question']}': must have exactly 4 options.",
                        )
                    correct = q.get("correct_option")
                    if not isinstance(correct, int) or correct < 0 or correct > 3:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Lesson '{les['title']}', question '{q['question']}': correct_option must be 0-3.",
                        )

        # --- Fetch and verify course ownership ---
        course = await self.repo.get_by_id(course_id, user_id)
        if not course:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")
        if course.is_deleted:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot import into a deleted course.",
            )

        # --- Delete existing sections (cascades to lessons, links, quiz questions) ---
        existing_sections = await self.section_repo.list_by_course(course_id)
        for section in existing_sections:
            await self.section_repo.delete(section)
        await self.db.flush()

        # --- Update course metadata ---
        update_fields: dict = {"title": course_data["title"][:200]}
        if "description" in course_data:
            update_fields["description"] = course_data["description"]
        if "category" in course_data:
            update_fields["category"] = course_data["category"]
        if "goal_date" in course_data:
            update_fields["goal_date"] = course_data["goal_date"]
        # Always reset to draft on import
        update_fields["status"] = "draft"
        update_fields["is_public"] = False
        await self.repo.update(course, **update_fields)

        # Update tags
        tag_names = course_data.get("tags", [])
        if isinstance(tag_names, list):
            await self.repo.set_tags(course, [str(t) for t in tag_names], user_id)

        # --- Create new sections with lessons ---
        import re

        def _sanitize_url(url: str | None) -> str | None:
            """Only allow http/https URLs in imported data."""
            if url and not re.match(r"^https?://", url, re.IGNORECASE):
                return None
            return url

        for sec_idx, sec_data in enumerate(sections_data):
            section = Section(
                course_id=course_id,
                title=sec_data["title"][:200],
                description=sec_data.get("description"),
                position=sec_data.get("position", sec_idx),
            )
            self.db.add(section)
            await self.db.flush()

            for les_idx, les_data in enumerate(sec_data.get("lessons", [])):
                lesson = Lesson(
                    section_id=section.id,
                    title=les_data["title"][:200],
                    lesson_type=les_data.get("lesson_type", "video"),
                    youtube_url=_sanitize_url(les_data.get("youtube_url")),
                    youtube_title=les_data.get("youtube_title"),
                    youtube_thumbnail=_sanitize_url(les_data.get("youtube_thumbnail")),
                    youtube_duration=les_data.get("youtube_duration"),
                    youtube_channel=les_data.get("youtube_channel"),
                    notes_markdown=les_data.get("notes_markdown"),
                    position=les_data.get("position", les_idx),
                )
                self.db.add(lesson)
                await self.db.flush()

                # Reference links
                for link_idx, link_data in enumerate(les_data.get("reference_links", [])):
                    link_url = link_data.get("url") if isinstance(link_data, dict) else None
                    if link_url and _sanitize_url(link_url):
                        link = ReferenceLinkModel(
                            lesson_id=lesson.id,
                            url=link_url,
                            title=link_data.get("title"),
                            description=link_data.get("description"),
                            image=_sanitize_url(link_data.get("image")),
                            favicon=_sanitize_url(link_data.get("favicon")),
                            domain=link_data.get("domain"),
                            position=link_data.get("position", link_idx),
                        )
                        self.db.add(link)

                # Quiz questions
                for q_idx, q_data in enumerate(les_data.get("quiz_questions", [])):
                    if isinstance(q_data, dict) and q_data.get("question"):
                        question = QuizQuestion(
                            lesson_id=lesson.id,
                            question=q_data["question"],
                            options=q_data["options"],
                            correct_option=q_data["correct_option"],
                            position=q_data.get("position", q_idx),
                        )
                        self.db.add(question)

        await self.db.commit()
        return await self._to_response(course)
