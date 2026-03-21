"""Repository for Certificate lookup, listing, and creation."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.certificate import Certificate


class CertificateRepository:
    """Data-access layer for course-completion certificates."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_user_and_course(
        self, user_id: uuid.UUID, course_id: uuid.UUID
    ) -> Certificate | None:
        """Fetch the certificate for a specific (user, course) pair."""
        result = await self.db.execute(
            select(Certificate).where(
                Certificate.user_id == user_id,
                Certificate.course_id == course_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_by_id(
        self, cert_id: uuid.UUID, user_id: uuid.UUID
    ) -> Certificate | None:
        """Fetch a certificate by primary key, scoped to a user."""
        result = await self.db.execute(
            select(Certificate).where(
                Certificate.id == cert_id,
                Certificate.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def list_by_user(self, user_id: uuid.UUID) -> list[Certificate]:
        """Return all certificates earned by a user, newest first."""
        result = await self.db.execute(
            select(Certificate)
            .where(Certificate.user_id == user_id)
            .order_by(Certificate.completed_at.desc())
        )
        return list(result.scalars().all())

    async def get_by_uid(self, certificate_uid: str) -> Certificate | None:
        """Fetch a certificate by its public shareable UID."""
        result = await self.db.execute(
            select(Certificate).where(Certificate.certificate_uid == certificate_uid)
        )
        return result.scalar_one_or_none()

    async def create(self, certificate: Certificate) -> Certificate:
        """Persist a new certificate to the database."""
        self.db.add(certificate)
        await self.db.flush()
        return certificate
