"""Full-text search service across courses, sections, lessons, and study notes.

Returns results with breadcrumb trails and frontend-ready URLs.
Searches course titles, descriptions, tags, lesson titles, notes content,
and reference link metadata.
"""

import uuid

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.course import Course
from app.models.lesson import Lesson
from app.models.reference_link import ReferenceLink
from app.models.section import Section
from app.models.study_note import StudyNote
from app.models.tag import Tag
from app.schemas.search import SearchResponse, SearchResultItem


class SearchService:
    """Performs ILIKE-based search across all content types with deduplication."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def search(self, user_id: uuid.UUID, query: str, limit: int = 20) -> SearchResponse:
        q = query.strip()
        if not q:
            return SearchResponse(results=[], query=query, total=0)

        pattern = f"%{q}%"
        results: list[SearchResultItem] = []

        # 1) Search courses
        course_results = await self._search_courses(user_id, pattern, limit)
        results.extend(course_results)

        # 2) Search sections (with parent course)
        section_results = await self._search_sections(user_id, pattern, limit)
        results.extend(section_results)

        # 3) Search lessons (with parent section + course)
        lesson_results = await self._search_lessons(user_id, pattern, limit)
        results.extend(lesson_results)

        # 4) Search study notes
        note_results = await self._search_notes(user_id, pattern, limit)
        results.extend(note_results)

        # Deduplicate by (type, id), keep first occurrence
        seen: set[tuple[str, str]] = set()
        deduped: list[SearchResultItem] = []
        for item in results:
            key = (item.type, item.id)
            if key not in seen:
                seen.add(key)
                deduped.append(item)

        # Truncate to limit
        deduped = deduped[:limit]

        return SearchResponse(results=deduped, query=query, total=len(deduped))

    async def _search_courses(
        self, user_id: uuid.UUID, pattern: str, limit: int
    ) -> list[SearchResultItem]:
        stmt = (
            select(Course)
            .outerjoin(Course.tags)
            .where(
                Course.user_id == user_id,
                Course.is_deleted == False,  # noqa: E712
                or_(
                    Course.title.ilike(pattern),
                    Course.description.ilike(pattern),
                    Tag.name.ilike(pattern),
                ),
            )
            .distinct()
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        courses = result.scalars().all()

        return [
            SearchResultItem(
                id=str(c.id),
                type="course",
                title=c.title,
                description=_truncate(c.description, 100),
                breadcrumb=c.title,
                url=f"/study/{c.id}" if c.status == "ready" else f"/courses/{c.id}/edit",
            )
            for c in courses
        ]

    async def _search_sections(
        self, user_id: uuid.UUID, pattern: str, limit: int
    ) -> list[SearchResultItem]:
        # JOIN course data directly to avoid N+1 parent lookups
        stmt = (
            select(
                Section,
                Course.title.label("course_title"),
                Course.id.label("course_id"),
                Course.status.label("course_status"),
            )
            .join(Course, Section.course_id == Course.id)
            .where(
                Course.user_id == user_id,
                Course.is_deleted == False,  # noqa: E712
                or_(
                    Section.title.ilike(pattern),
                    Section.description.ilike(pattern),
                ),
            )
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        rows = result.all()

        return [
            SearchResultItem(
                id=str(row.Section.id),
                type="section",
                title=row.Section.title,
                description=_truncate(row.Section.description, 100),
                breadcrumb=f"{row.course_title} > {row.Section.title}",
                url=f"/study/{row.course_id}"
                if row.course_status == "ready"
                else f"/courses/{row.course_id}/edit",
            )
            for row in rows
        ]

    async def _search_lessons(
        self, user_id: uuid.UUID, pattern: str, limit: int
    ) -> list[SearchResultItem]:
        # JOIN section + course data to avoid N×2 parent lookups
        stmt = (
            select(
                Lesson,
                Section.title.label("section_title"),
                Course.id.label("course_id"),
                Course.title.label("course_title"),
                Course.status.label("course_status"),
            )
            .join(Section, Lesson.section_id == Section.id)
            .join(Course, Section.course_id == Course.id)
            .outerjoin(ReferenceLink, ReferenceLink.lesson_id == Lesson.id)
            .where(
                Course.user_id == user_id,
                Course.is_deleted == False,  # noqa: E712
                or_(
                    Lesson.title.ilike(pattern),
                    Lesson.youtube_title.ilike(pattern),
                    Lesson.notes_markdown.ilike(pattern),
                    ReferenceLink.title.ilike(pattern),
                    ReferenceLink.description.ilike(pattern),
                ),
            )
            .distinct()
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        rows = result.all()

        return [
            SearchResultItem(
                id=str(row.Lesson.id),
                type="lesson",
                title=row.Lesson.title,
                description=row.Lesson.youtube_title or _truncate(row.Lesson.notes_markdown, 100),
                breadcrumb=f"{row.course_title} > {row.section_title} > {row.Lesson.title}",
                url=f"/study/{row.course_id}/lessons/{row.Lesson.id}"
                if row.course_status == "ready"
                else f"/courses/{row.course_id}/edit",
            )
            for row in rows
        ]

    async def _search_notes(
        self, user_id: uuid.UUID, pattern: str, limit: int
    ) -> list[SearchResultItem]:
        # JOIN lesson + section + course to avoid N×3 parent lookups
        stmt = (
            select(
                StudyNote,
                Lesson.title.label("lesson_title"),
                Lesson.id.label("lesson_id"),
                Section.title.label("section_title"),
                Course.id.label("course_id"),
                Course.title.label("course_title"),
            )
            .join(Lesson, StudyNote.lesson_id == Lesson.id)
            .join(Section, Lesson.section_id == Section.id)
            .join(Course, Section.course_id == Course.id)
            .where(
                StudyNote.user_id == user_id,
                StudyNote.content.ilike(pattern),
            )
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        rows = result.all()

        return [
            SearchResultItem(
                id=str(row.StudyNote.id),
                type="note",
                title=f"Note: {row.lesson_title}",
                description=_truncate(row.StudyNote.content, 100),
                breadcrumb=f"{row.course_title} > {row.section_title} > {row.lesson_title}",
                url=f"/study/{row.course_id}/lessons/{row.lesson_id}",
            )
            for row in rows
        ]


def _truncate(text: str | None, length: int) -> str | None:
    if not text:
        return None
    if len(text) <= length:
        return text
    return text[:length].rstrip() + "..."
