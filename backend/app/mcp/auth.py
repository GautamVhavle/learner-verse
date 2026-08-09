"""Authentication adapter for personal tokens used by the MCP HTTP transport."""

from __future__ import annotations

from mcp.server.auth.provider import AccessToken

from app.core.config import settings
from app.core.database import async_session_maker
from app.production.personal_tokens import PersonalTokenService


class PersonalTokenVerifier:
    """Verify copy-once LearnerVerse PATs without storing their plaintext."""

    async def verify_token(self, token: str) -> AccessToken | None:
        signing_key = settings.MCP_PAT_SIGNING_KEY or settings.SECRET_KEY
        async with async_session_maker() as db:
            record = await PersonalTokenService(db, signing_key).authenticate(token)

        if record is None:
            return None

        return AccessToken(
            token=token,
            client_id=record.token_prefix,
            scopes=list(record.scopes),
            expires_at=int(record.expires_at.timestamp()) if record.expires_at else None,
            resource=settings.MCP_PUBLIC_URL,
            subject=str(record.user_id),
            claims={
                "iss": settings.MCP_ISSUER_URL,
                "token_type": "personal_access_token",
            },
        )
