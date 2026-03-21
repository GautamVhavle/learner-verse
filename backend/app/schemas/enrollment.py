"""Pydantic schemas for course enrollment."""

import uuid
from datetime import datetime

from pydantic import BaseModel


class EnrollmentResponse(BaseModel):
    course_id: uuid.UUID
    enrolled_at: datetime

    model_config = {"from_attributes": True}
