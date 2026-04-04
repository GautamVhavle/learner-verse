"""Pydantic schemas for the discussion room feature."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class DiscussionMessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)
    reply_to_id: uuid.UUID | None = None


class ReplyBrief(BaseModel):
    id: uuid.UUID
    display_name: str
    role: str
    content: str

    model_config = {"from_attributes": True}


class DiscussionMessageResponse(BaseModel):
    id: uuid.UUID
    course_id: uuid.UUID
    user_id: uuid.UUID | None
    role: str
    display_name: str
    content: str
    reply_to_id: uuid.UUID | None = None
    reply_preview: ReplyBrief | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class DiscussionPage(BaseModel):
    items: list[DiscussionMessageResponse]
    has_more: bool
