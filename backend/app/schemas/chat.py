"""Pydantic schemas for LiVi chat — threads and messages."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


# ── Requests ───────────────────────────────────────────────────

class ThreadCreate(BaseModel):
    title: str = Field(default="New Chat", max_length=200)


class ThreadRename(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    context: str | None = Field(default=None, max_length=500)


# ── Responses ──────────────────────────────────────────────────

class MessageResponse(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ThreadResponse(BaseModel):
    id: uuid.UUID
    title: str
    created_at: datetime
    updated_at: datetime
    message_preview: str | None = None

    model_config = {"from_attributes": True}


class ThreadDetailResponse(BaseModel):
    id: uuid.UUID
    title: str
    created_at: datetime
    updated_at: datetime
    messages: list[MessageResponse]

    model_config = {"from_attributes": True}


class ThreadListResponse(BaseModel):
    items: list[ThreadResponse]
