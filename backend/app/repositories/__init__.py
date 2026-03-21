"""Data-access repositories for the Learner Verse database.

Each repository encapsulates all queries and mutations for a single
aggregate root (e.g. Course, Section, Lesson). Import from here::

    from app.repositories import CourseRepository, SectionRepository
"""

from app.repositories.activity_repo import ActivityRepository
from app.repositories.certificate_repo import CertificateRepository
from app.repositories.course_repo import CourseRepository
from app.repositories.lesson_repo import LessonRepository
from app.repositories.progress_repo import ProgressRepository
from app.repositories.reference_link_repo import ReferenceLinkRepository
from app.repositories.section_repo import SectionRepository
from app.repositories.study_note_repo import StudyNoteRepository
from app.repositories.study_state_repo import StudyStateRepository

__all__ = [
    "ActivityRepository",
    "CertificateRepository",
    "CourseRepository",
    "LessonRepository",
    "ProgressRepository",
    "ReferenceLinkRepository",
    "SectionRepository",
    "StudyNoteRepository",
    "StudyStateRepository",
]
