"""Service for exporting and importing courses as JSON.

Export serialises a complete course (sections → lessons → reference links)
into a portable JSON format. Import reconstructs the full hierarchy in the
user's account.
"""

import uuid

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lesson import Lesson
from app.models.reference_link import ReferenceLink
from app.models.section import Section
from app.repositories.course_repo import CourseRepository
from app.repositories.section_repo import SectionRepository
from app.schemas.course import CourseResponse
from app.schemas.export import (
    CourseExportData,
    LessonExport,
    ReferenceLinkExport,
    SectionExport,
)
from app.services.course_service import MAX_COURSES_PER_USER


class ExportImportService:
    """Handles full-fidelity JSON export and import of course structures."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.course_repo = CourseRepository(db)
        self.section_repo = SectionRepository(db)

    async def export_course(
        self, course_id: uuid.UUID, user_id: uuid.UUID
    ) -> CourseExportData:
        """Serialise a course and its full hierarchy into an exportable format."""
        course = await self.course_repo.get_by_id(course_id, user_id)
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found.",
            )

        sections = await self.section_repo.list_by_course(course.id)
        tag_names = [t.name for t in (course.tags or [])]

        section_exports: list[SectionExport] = []
        for section in sections:
            lesson_exports: list[LessonExport] = []
            for lesson in section.lessons:
                link_exports = [
                    ReferenceLinkExport(
                        url=link.url,
                        title=link.title,
                        description=link.description,
                        image=link.image,
                        favicon=link.favicon,
                        domain=link.domain,
                        position=link.position,
                    )
                    for link in lesson.reference_links
                ]
                lesson_exports.append(
                    LessonExport(
                        title=lesson.title,
                        youtube_url=lesson.youtube_url,
                        youtube_title=lesson.youtube_title,
                        youtube_thumbnail=lesson.youtube_thumbnail,
                        youtube_duration=lesson.youtube_duration,
                        youtube_channel=lesson.youtube_channel,
                        notes_markdown=lesson.notes_markdown,
                        position=lesson.position,
                        reference_links=link_exports,
                    )
                )
            section_exports.append(
                SectionExport(
                    title=section.title,
                    description=section.description,
                    position=section.position,
                    lessons=lesson_exports,
                )
            )

        return CourseExportData(
            export_version=1,
            title=course.title,
            description=course.description,
            thumbnail_url=course.thumbnail_url,
            tags=tag_names,
            sections=section_exports,
        )

    async def import_course(
        self, user_id: uuid.UUID, data: CourseExportData
    ) -> CourseResponse:
        """Recreate a full course structure from exported JSON data."""
        if data.export_version != 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported export version: {data.export_version}",
            )

        count = await self.course_repo.count_active(user_id)
        if count >= MAX_COURSES_PER_USER:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Maximum of {MAX_COURSES_PER_USER} courses reached.",
            )

        # Create the course
        course = await self.course_repo.create(
            user_id=user_id,
            title=data.title,
            description=data.description,
            thumbnail_url=data.thumbnail_url,
        )

        # Set tags
        if data.tags:
            await self.course_repo.set_tags(course, data.tags, user_id)

        # Create sections, lessons, and reference links
        for sec_data in data.sections:
            section = Section(
                course_id=course.id,
                title=sec_data.title,
                description=sec_data.description,
                position=sec_data.position,
            )
            self.db.add(section)
            await self.db.flush()

            for les_data in sec_data.lessons:
                lesson = Lesson(
                    section_id=section.id,
                    title=les_data.title,
                    youtube_url=les_data.youtube_url,
                    youtube_title=les_data.youtube_title,
                    youtube_thumbnail=les_data.youtube_thumbnail,
                    youtube_duration=les_data.youtube_duration,
                    youtube_channel=les_data.youtube_channel,
                    notes_markdown=les_data.notes_markdown,
                    position=les_data.position,
                )
                self.db.add(lesson)
                await self.db.flush()

                for link_data in les_data.reference_links:
                    link = ReferenceLink(
                        lesson_id=lesson.id,
                        url=link_data.url,
                        title=link_data.title,
                        description=link_data.description,
                        image=link_data.image,
                        favicon=link_data.favicon,
                        domain=link_data.domain,
                        position=link_data.position,
                    )
                    self.db.add(link)

        await self.db.commit()

        # Return the fully populated course response
        from app.services.course_service import CourseService

        svc = CourseService(self.db)
        return await svc._to_response(course)
