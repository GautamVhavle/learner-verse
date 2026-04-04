"""API endpoints for course-completion certificates."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.certificate import (
    CertificateDetailResponse,
    CertificateResponse,
    LessonBrief,
    SectionBrief,
)
from app.services.certificate_service import CertificateService
from app.services.notification_service import NotificationService
from app.repositories.section_repo import SectionRepository

router = APIRouter(prefix="/certificates", tags=["certificates"])


@router.get("/share/{certificate_uid}", response_model=CertificateDetailResponse)
async def get_shared_certificate(
    certificate_uid: str,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint: get certificate with full course structure (no auth required)."""
    svc = CertificateService(db)
    cert = await svc.get_by_uid(certificate_uid)
    if cert is None:
        raise HTTPException(
            status_code=404, detail="Certificate not found."
        )

    # Build course structure metadata
    section_repo = SectionRepository(db)
    sections = await section_repo.list_by_course(cert.course_id)
    course_description: str | None = None
    if cert.course:
        course_description = cert.course.description

    section_briefs = [
        SectionBrief(
            title=s.title,
            lessons=[
                LessonBrief(title=l.title, lesson_type=l.lesson_type or "video")
                for l in sorted(s.lessons, key=lambda le: le.position)
            ],
        )
        for s in sections
    ]

    data = CertificateResponse.model_validate(cert).model_dump()
    return CertificateDetailResponse(
        **data,
        course_description=course_description,
        sections=section_briefs,
    )


@router.get("", response_model=list[CertificateResponse])
async def list_certificates(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all certificates earned by the current user."""
    svc = CertificateService(db)
    certs = await svc.list_certificates(user.id)
    return [CertificateResponse.model_validate(c) for c in certs]


@router.post("/courses/{course_id}", response_model=CertificateResponse)
async def generate_certificate(
    course_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate a certificate for a completed course."""
    svc = CertificateService(db)
    cert = await svc.generate(course_id, user.id, user.display_name)

    # Send certificate notification
    notif_svc = NotificationService(db)
    await notif_svc.notify_certificate_earned(user.id, cert.course_title)

    return CertificateResponse.model_validate(cert)


@router.get("/courses/{course_id}", response_model=CertificateResponse | None)
async def get_certificate_by_course(
    course_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get certificate for a specific course (if it exists)."""
    svc = CertificateService(db)
    cert = await svc.get_by_course(course_id, user.id)
    if cert is None:
        return None
    return CertificateResponse.model_validate(cert)


@router.get("/{certificate_id}", response_model=CertificateResponse)
async def get_certificate(
    certificate_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific certificate by ID."""
    svc = CertificateService(db)
    cert = await svc.get_by_id(certificate_id, user.id)
    return CertificateResponse.model_validate(cert)
