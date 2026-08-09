"""SQLAlchemy ORM models for the Learner Verse database.

Import any model from this package directly::

    from app.models import Course, Section, Lesson
"""

from app.models.activity_log import ActivityLog
from app.models.base import Base
from app.models.certificate import Certificate
from app.models.chat_message import ChatMessage
from app.models.chat_thread import ChatThread
from app.models.course import Course
from app.models.course_study_state import CourseStudyState
from app.models.discussion_message import DiscussionMessage
from app.models.enrollment import CourseEnrollment
from app.models.lesson import Lesson
from app.models.lesson_progress import LessonProgress
from app.models.mcp_token import McpPersonalAccessToken
from app.models.notification import Notification
from app.models.production import (
    IdempotencyRecord,
    JobAttempt,
    JobEvent,
    OutboxMessage,
    ProductionProject,
    ProductionRun,
    ProductionSpecVersion,
    UsageLedger,
)
from app.models.production_assets import (
    BudgetReservation,
    ProductionArtifact,
    ProductionAsset,
    ProductionAssetBinding,
    ProductionAssetUploadIntent,
    ProductionAssetVersion,
    ProductionQaReport,
    ProviderCredential,
    RenderManifest,
)
from app.models.quiz_attempt import QuizAttempt
from app.models.quiz_question import QuizQuestion
from app.models.rating import CourseRating
from app.models.reference_link import ReferenceLink
from app.models.section import Section
from app.models.study_note import StudyNote
from app.models.tag import Tag, course_tags
from app.models.user import User
from app.models.verification_request import VerificationRequest

__all__ = [
    "ActivityLog",
    "BudgetReservation",
    "Base",
    "Certificate",
    "ChatMessage",
    "ChatThread",
    "Course",
    "CourseEnrollment",
    "CourseRating",
    "CourseStudyState",
    "DiscussionMessage",
    "Lesson",
    "McpPersonalAccessToken",
    "LessonProgress",
    "Notification",
    "IdempotencyRecord",
    "JobAttempt",
    "JobEvent",
    "OutboxMessage",
    "ProductionProject",
    "ProductionAsset",
    "ProductionArtifact",
    "ProductionAssetBinding",
    "ProductionAssetUploadIntent",
    "ProductionAssetVersion",
    "ProductionQaReport",
    "ProductionRun",
    "ProductionSpecVersion",
    "QuizAttempt",
    "ProviderCredential",
    "RenderManifest",
    "QuizQuestion",
    "ReferenceLink",
    "Section",
    "StudyNote",
    "Tag",
    "User",
    "UsageLedger",
    "VerificationRequest",
    "course_tags",
]
