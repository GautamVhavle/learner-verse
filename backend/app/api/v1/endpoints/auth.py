"""API endpoints for authentication and user profile."""

from pydantic import BaseModel, EmailStr
from fastapi import APIRouter, Depends
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models import (
    ActivityLog,
    Certificate,
    ChatMessage,
    ChatThread,
    Course,
    CourseEnrollment,
    CourseRating,
    CourseStudyState,
    LessonProgress,
    Notification,
    QuizAttempt,
    StudyNote,
    Tag,
    User,
    course_tags,
)
from app.schemas.user import UserResponse, UserUpdate

router = APIRouter(prefix="/auth", tags=["auth"])


# ── Profile Endpoints ────────────────────────────────────────────


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    """Get current authenticated user profile."""
    return user


@router.put("/me", response_model=UserResponse)
async def update_me(
    payload: UserUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update current user profile fields."""
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    return user


class ProfileSyncRequest(BaseModel):
    """One-time sync of OAuth provider email to the backend user record."""
    email: EmailStr


@router.post("/me/sync", response_model=UserResponse)
async def sync_profile(
    payload: ProfileSyncRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Sync OAuth provider email on first login.

    Only updates email if the current value is the auto-generated placeholder.
    """
    if user.email.endswith("@auth0.user"):
        user.email = payload.email
        await db.commit()
        await db.refresh(user)
    return user


# ── Danger Zone Endpoints ────────────────────────────────────────


@router.delete("/me/data", status_code=204)
async def delete_all_data(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete ALL user data — courses, progress, stats, chats, everything.

    Resets the user account to a blank slate without deleting the account itself.
    """
    uid = user.id

    # Delete chat messages first (FK to chat_threads)
    user_thread_ids = select(ChatThread.id).where(ChatThread.user_id == uid)
    await db.execute(delete(ChatMessage).where(ChatMessage.thread_id.in_(user_thread_ids)))
    await db.execute(delete(ChatThread).where(ChatThread.user_id == uid))

    # Delete learning stats & progress
    await db.execute(delete(ActivityLog).where(ActivityLog.user_id == uid))
    await db.execute(delete(LessonProgress).where(LessonProgress.user_id == uid))
    await db.execute(delete(CourseStudyState).where(CourseStudyState.user_id == uid))
    await db.execute(delete(QuizAttempt).where(QuizAttempt.user_id == uid))
    await db.execute(delete(StudyNote).where(StudyNote.user_id == uid))
    await db.execute(delete(CourseEnrollment).where(CourseEnrollment.user_id == uid))
    await db.execute(delete(CourseRating).where(CourseRating.user_id == uid))
    await db.execute(delete(Certificate).where(Certificate.user_id == uid))
    await db.execute(delete(Notification).where(Notification.user_id == uid))

    # Delete courses (cascade removes sections, lessons, reference_links, quiz_questions)
    user_course_ids = select(Course.id).where(Course.user_id == uid)
    await db.execute(delete(course_tags).where(course_tags.c.course_id.in_(user_course_ids)))
    await db.execute(delete(Tag).where(Tag.user_id == uid))
    await db.execute(delete(Course).where(Course.user_id == uid))

    await db.commit()


@router.delete("/me/courses", status_code=204)
async def delete_all_courses(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete all courses created by the user.

    Also removes associated tags. Learning progress on other users' courses is preserved.
    """
    uid = user.id
    user_course_ids = select(Course.id).where(Course.user_id == uid)
    await db.execute(delete(course_tags).where(course_tags.c.course_id.in_(user_course_ids)))
    await db.execute(delete(Tag).where(Tag.user_id == uid))
    await db.execute(delete(Course).where(Course.user_id == uid))
    await db.commit()


@router.delete("/me/stats", status_code=204)
async def delete_learner_stats(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete all learning stats — progress, streaks, quiz attempts, study notes."""
    uid = user.id
    await db.execute(delete(ActivityLog).where(ActivityLog.user_id == uid))
    await db.execute(delete(LessonProgress).where(LessonProgress.user_id == uid))
    await db.execute(delete(CourseStudyState).where(CourseStudyState.user_id == uid))
    await db.execute(delete(QuizAttempt).where(QuizAttempt.user_id == uid))
    await db.execute(delete(StudyNote).where(StudyNote.user_id == uid))
    await db.execute(delete(Certificate).where(Certificate.user_id == uid))
    await db.commit()


@router.delete("/me", status_code=204)
async def delete_account(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Permanently delete the user account and ALL associated data.

    The user will be logged out after this call. This cannot be undone.
    """
    await db.delete(user)
    await db.commit()
