"""Service for generating and managing course-completion certificates.

A certificate is issued when a user achieves 100% completion on a course.
Each certificate gets a unique shareable UID (e.g. LV-2026-A1B2C3D4).
"""

import secrets
import uuid
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.certificate import Certificate
from app.models.course import Course
from app.repositories.certificate_repo import CertificateRepository
from app.repositories.enrollment_repo import EnrollmentRepository
from app.services.progress_service import ProgressService


class CertificateService:
    """Business logic for certificate generation, lookup, and listing."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = CertificateRepository(db)

    # ── Generation ───────────────────────────────────────────

    async def generate(
        self,
        course_id: uuid.UUID,
        user_id: uuid.UUID,
        user_name: str,
    ) -> Certificate:
        """Generate a certificate for a completed course.

        Returns the existing certificate if one already exists.
        Raises 400 if the course has no lessons or isn't 100% complete.
        """
        # Idempotent: return existing certificate if already earned
        existing = await self.repo.get_by_user_and_course(user_id, course_id)
        if existing:
            return existing

        # Verify 100% completion
        progress_svc = ProgressService(self.db)
        progress = await progress_svc.get_course_progress(course_id, user_id)

        if progress.total_lessons == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Course has no lessons.",
            )

        if progress.percentage < 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Course is only {progress.percentage}% complete. Must be 100% to earn a certificate.",
            )

        # Fetch the course title for the certificate snapshot
        course_title = await self._get_course_title(course_id)

        certificate = Certificate(
            user_id=user_id,
            course_id=course_id,
            certificate_uid=self._generate_uid(),
            user_name=user_name,
            course_title=course_title,
            sections_count=len(progress.sections),
            lessons_count=progress.total_lessons,
            completed_at=datetime.now(UTC),
        )

        certificate = await self.repo.create(certificate)

        # Backfill: stamp enrollment.completed_at if not already set
        enrollment_repo = EnrollmentRepository(self.db)
        await enrollment_repo.mark_completed(user_id, course_id, datetime.now(UTC))

        await self.db.commit()
        await self.db.refresh(certificate)
        return certificate

    # ── Lookups ──────────────────────────────────────────────

    async def get_by_id(self, cert_id: uuid.UUID, user_id: uuid.UUID) -> Certificate:
        """Fetch a certificate by ID. Raises 404 if not found."""
        cert = await self.repo.get_by_id(cert_id, user_id)
        if not cert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Certificate not found.",
            )
        return cert

    async def list_certificates(self, user_id: uuid.UUID) -> list[Certificate]:
        """Return all certificates earned by a user."""
        return await self.repo.list_by_user(user_id)

    async def get_by_course(self, course_id: uuid.UUID, user_id: uuid.UUID) -> Certificate | None:
        """Fetch the certificate for a specific course (if it exists)."""
        return await self.repo.get_by_user_and_course(user_id, course_id)

    async def get_by_uid(self, certificate_uid: str) -> Certificate | None:
        """Fetch a certificate by its public shareable UID."""
        return await self.repo.get_by_uid(certificate_uid)

    # ── Private Helpers ──────────────────────────────────────

    @staticmethod
    def _generate_uid() -> str:
        """Generate a unique certificate UID like ``LV-2026-A1B2C3D4E5F6``."""
        year = datetime.now(UTC).year
        random_part = secrets.token_hex(8).upper()
        return f"LV-{year}-{random_part}"

    async def _get_course_title(self, course_id: uuid.UUID) -> str:
        """Fetch the course title for embedding in the certificate snapshot."""
        result = await self.db.execute(select(Course).where(Course.id == course_id))
        course = result.scalar_one_or_none()
        return course.title if course else "Unknown Course"
