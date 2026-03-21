"""Pydantic schemas for course-completion certificates."""

import uuid
from datetime import datetime

from pydantic import BaseModel


class CertificateResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    course_id: uuid.UUID
    certificate_uid: str
    user_name: str
    course_title: str
    sections_count: int
    lessons_count: int
    completed_at: datetime

    model_config = {"from_attributes": True}
