"""Authenticated Settings API for personal MCP tokens and provider keys."""

from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.models.mcp_token import McpPersonalAccessToken
from app.models.production_assets import ProviderCredential
from app.models.user import User
from app.production.assets.credentials import CredentialCipher
from app.production.personal_tokens import PersonalTokenService

router = APIRouter(prefix="/mcp-settings", tags=["mcp-settings"])


class TokenCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    scopes: list[str] = Field(min_length=1)
    expires_at: datetime | None = None


class CredentialInput(BaseModel):
    provider: str
    credential_kind: str
    label: str = "default"
    secret: str = Field(min_length=1, max_length=10000)


def token_service(db: AsyncSession) -> PersonalTokenService:
    return PersonalTokenService(db, settings.MCP_PAT_SIGNING_KEY or settings.SECRET_KEY)


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
    row, secret = await token_service(db).create(user.id, body.name, body.scopes, body.expires_at)
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
        row.masked_hint = cipher.masked(body.secret)
        row.active = True
    await db.commit()
    return {"id": str(row.id), "masked_hint": row.masked_hint}
