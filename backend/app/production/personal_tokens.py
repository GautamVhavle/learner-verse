"""Copy-once personal MCP tokens. Stored verifier cannot recover a secret."""

from __future__ import annotations

import hashlib
import hmac
import secrets
import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.mcp_token import McpPersonalAccessToken


class PersonalTokenService:
    def __init__(self, db: AsyncSession, signing_key: str) -> None:
        self.db = db
        self.key = signing_key.encode()

    def _verify(self, token: str) -> str:
        return hmac.new(self.key, token.encode(), hashlib.sha256).hexdigest()

    async def create(
        self,
        user_id: uuid.UUID,
        name: str,
        scopes: list[str],
        expires_at: datetime | None = None,
    ) -> tuple[McpPersonalAccessToken, str]:
        secret = secrets.token_urlsafe(32)
        prefix = "lvmcp_" + secrets.token_hex(6)
        token = prefix + "_" + secret
        row = McpPersonalAccessToken(
            user_id=user_id,
            name=name[:100],
            token_prefix=prefix,
            verifier=self._verify(token),
            scopes=sorted(set(scopes)),
            expires_at=expires_at,
        )
        self.db.add(row)
        await self.db.commit()
        return row, token

    async def authenticate(self, token: str) -> McpPersonalAccessToken | None:
        prefix = "_".join(token.split("_")[:2])
        row = await self.db.scalar(
            select(McpPersonalAccessToken).where(McpPersonalAccessToken.token_prefix == prefix)
        )
        if (
            not row
            or row.revoked
            or (row.expires_at and row.expires_at <= datetime.now(UTC))
            or not hmac.compare_digest(row.verifier, self._verify(token))
        ):
            return None
        row.last_used_at = datetime.now(UTC)
        await self.db.commit()
        return row

    async def revoke(self, user_id: uuid.UUID, token_id: uuid.UUID) -> bool:
        row = await self._owned_token(user_id, token_id)
        if not row:
            return False
        row.revoked = True
        await self.db.commit()
        return True

    async def delete_revoked(self, user_id: uuid.UUID, token_id: uuid.UUID) -> str:
        """Permanently delete a revoked token without allowing active-token accidents."""
        row = await self._owned_token(user_id, token_id)
        if not row:
            return "not_found"
        if not row.revoked:
            return "active"
        await self.db.delete(row)
        await self.db.commit()
        return "deleted"

    async def purge_revoked(self, user_id: uuid.UUID) -> int:
        """Delete all revoked token records owned by a user and return the count."""
        rows = (
            await self.db.scalars(
                select(McpPersonalAccessToken).where(
                    McpPersonalAccessToken.user_id == user_id,
                    McpPersonalAccessToken.revoked.is_(True),
                )
            )
        ).all()
        for row in rows:
            await self.db.delete(row)
        await self.db.commit()
        return len(rows)

    async def _owned_token(
        self, user_id: uuid.UUID, token_id: uuid.UUID
    ) -> McpPersonalAccessToken | None:
        return await self.db.scalar(
            select(McpPersonalAccessToken).where(
                McpPersonalAccessToken.id == token_id,
                McpPersonalAccessToken.user_id == user_id,
            )
        )
