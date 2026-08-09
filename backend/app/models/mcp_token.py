from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.types import JSONVariant, UUIDType


class McpPersonalAccessToken(Base):
    __tablename__ = "mcp_personal_access_tokens"
    id: Mapped[uuid.UUID] = mapped_column(UUIDType, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUIDType, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    token_prefix: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)
    verifier: Mapped[str] = mapped_column(Text, nullable=False)
    # The migration intentionally uses JSONB on PostgreSQL and JSON on SQLite.
    # Do not use TextArray here: that binds a PostgreSQL text[] value to a
    # JSONB column and causes token creation to fail at runtime.
    scopes: Mapped[list[str]] = mapped_column(JSONVariant, nullable=False, default=list)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    revoked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
