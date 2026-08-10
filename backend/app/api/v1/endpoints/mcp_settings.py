"""Authenticated Settings API for personal MCP tokens and provider keys."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.models.mcp_token import McpPersonalAccessToken
from app.models.production_assets import ProviderCredential
from app.models.user import User
from app.production.assets.credentials import CredentialCipher
from app.production.permissions import Scope
from app.production.personal_tokens import PersonalTokenService, TokenLimitExceeded

router = APIRouter(prefix="/mcp-settings", tags=["mcp-settings"])


class TokenCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=100)
    scopes: list[str] = Field(min_length=1, max_length=len(Scope))
    expires_at: datetime | None = None

    @field_validator("scopes")
    @classmethod
    def validate_scopes(cls, scopes: list[str]) -> list[str]:
        allowed = {scope.value for scope in Scope}
        normalized = sorted(set(scopes))
        invalid = sorted(set(normalized) - allowed)
        if invalid:
            raise ValueError(f"unsupported MCP scopes: {', '.join(invalid)}")
        return normalized

    @field_validator("expires_at")
    @classmethod
    def validate_expiration(cls, expires_at: datetime | None) -> datetime | None:
        if expires_at is None:
            return None
        normalized = (
            expires_at.replace(tzinfo=UTC)
            if expires_at.tzinfo is None
            else expires_at.astimezone(UTC)
        )
        if normalized <= datetime.now(UTC):
            raise ValueError("expiration must be in the future")
        return normalized


class CredentialInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    provider: str = Field(min_length=1, max_length=80)
    credential_kind: str = Field(min_length=1, max_length=40)
    label: str = Field(default="default", min_length=1, max_length=100)
    secret: str = Field(min_length=1, max_length=10000)


def token_service(db: AsyncSession) -> PersonalTokenService:
    return PersonalTokenService(
        db,
        settings.MCP_PAT_SIGNING_KEY or settings.SECRET_KEY,
        max_active_tokens=settings.PRODUCTION_MAX_TOKENS_PER_USER,
    )


@router.get("/status")
async def mcp_status(user: User = Depends(get_current_user)):
    return {
        "mcp_url": "/mcp",
        "oauth_configured": not settings.SINGLE_USER_MODE,
        "personal_tokens_enabled": True,
        "user_id": str(user.id),
    }


@router.post("/tokens")
async def create_token(
    body: TokenCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        row, secret = await token_service(db).create(
            user.id, body.name, body.scopes, body.expires_at
        )
    except TokenLimitExceeded as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Maximum of {exc.limit} active MCP tokens reached. Revoke an old key first.",
        ) from exc
    return {
        "id": str(row.id),
        "token": secret,
        "token_prefix": row.token_prefix,
        "scopes": row.scopes,
    }


@router.get("/tokens")
async def list_tokens(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = (
        await db.scalars(
            select(McpPersonalAccessToken)
            .where(McpPersonalAccessToken.user_id == user.id)
            .order_by(McpPersonalAccessToken.revoked, McpPersonalAccessToken.created_at.desc())
        )
    ).all()
    now = datetime.now(UTC)

    def is_expired(row: McpPersonalAccessToken) -> bool:
        if row.expires_at is None:
            return False
        expires_at = row.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=UTC)
        return expires_at <= now

    return [
        {
            "id": str(row.id),
            "name": row.name,
            "token_prefix": row.token_prefix,
            "scopes": row.scopes,
            "expires_at": row.expires_at,
            "last_used_at": row.last_used_at,
            "created_at": row.created_at,
            "revoked": row.revoked,
            "expired": is_expired(row),
        }
        for row in rows
    ]


@router.delete("/tokens/revoked")
async def purge_revoked_tokens(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    deleted = await token_service(db).purge_revoked(user.id)
    return {"deleted": deleted}


@router.delete("/tokens/{token_id}")
async def revoke_token(
    token_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not await token_service(db).revoke(user.id, token_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Token not found")
    return {"revoked": True}


@router.delete("/tokens/{token_id}/permanent")
async def permanently_delete_token(
    token_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await token_service(db).delete_revoked(user.id, token_id)
    if result == "not_found":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Token not found")
    if result == "active":
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Revoke the token before permanently deleting it",
        )
    return {"deleted": True}


@router.get("/credentials")
async def list_credentials(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    rows = (
        await db.scalars(select(ProviderCredential).where(ProviderCredential.user_id == user.id))
    ).all()
    return [
        {
            "id": str(row.id),
            "provider": row.provider,
            "credential_kind": row.credential_kind,
            "label": row.label,
            "masked_hint": row.masked_hint,
            "active": row.active,
        }
        for row in rows
    ]


@router.put("/credentials")
async def save_credential(
    body: CredentialInput,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cipher = CredentialCipher(settings.CREDENTIAL_ENCRYPTION_KEYS, settings.SECRET_KEY)
    row = await db.scalar(
        select(ProviderCredential).where(
            ProviderCredential.user_id == user.id,
            ProviderCredential.provider == body.provider,
            ProviderCredential.credential_kind == body.credential_kind,
            ProviderCredential.label == body.label,
        )
    )
    if row is None:
        row = ProviderCredential(
            user_id=user.id,
            provider=body.provider,
            credential_kind=body.credential_kind,
            label=body.label,
            encrypted_secret=cipher.encrypt(body.secret),
            key_version=cipher.key_version,
            masked_hint=cipher.masked(body.secret),
        )
        db.add(row)
    else:
        row.encrypted_secret = cipher.encrypt(body.secret)
        row.key_version = cipher.key_version
        row.masked_hint = cipher.masked(body.secret)
        row.active = True
    await db.commit()
    return {"id": str(row.id), "masked_hint": row.masked_hint}
