import uuid
from contextlib import asynccontextmanager

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy.dialects import postgresql
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.sqltypes import JSON

from app.core.config import settings
from app.mcp.auth import PersonalTokenVerifier
from app.mcp.server import mcp, streamable_app
from app.models.mcp_token import McpPersonalAccessToken
from app.models.production import ProductionProject, ProductionSpecVersion
from app.models.user import User
from app.production.personal_tokens import PersonalTokenService
from app.production.pipeline import ProductionPipeline, QaGateError


async def user(db: AsyncSession) -> User:
    row = User(id=uuid.uuid4(), email="batch-c@example.test", display_name="Batch C")
    db.add(row)
    await db.commit()
    return row


def test_personal_token_scopes_match_jsonb_migration():
    column_type = McpPersonalAccessToken.__table__.c.scopes.type
    assert isinstance(column_type, JSON)
    assert column_type.dialect_impl(postgresql.dialect()).__class__.__name__ == "_PGJSONB"


@pytest.mark.asyncio
async def test_personal_token_is_copy_once_and_revocable(db_session: AsyncSession):
    test_user = await user(db_session)
    service = PersonalTokenService(db_session, "test-key")
    row, token = await service.create(test_user.id, "IDE", ["mcp:read"])
    assert token.startswith("lvmcp_") and token not in row.verifier
    assert (await service.authenticate(token)).id == row.id
    assert await service.revoke(test_user.id, row.id)
    assert await service.authenticate(token) is None


@pytest.mark.asyncio
async def test_personal_tokens_can_only_be_deleted_after_revocation(db_session: AsyncSession):
    test_user = await user(db_session)
    service = PersonalTokenService(db_session, "test-key")
    active, _ = await service.create(test_user.id, "Active", ["mcp:read"])
    revoked, _ = await service.create(test_user.id, "Revoked", ["mcp:read"])

    assert await service.delete_revoked(test_user.id, active.id) == "active"
    assert await service.revoke(test_user.id, revoked.id)
    assert await service.delete_revoked(test_user.id, revoked.id) == "deleted"
    assert await service.delete_revoked(test_user.id, revoked.id) == "not_found"


@pytest.mark.asyncio
async def test_personal_tokens_can_purge_all_revoked_rows(db_session: AsyncSession):
    test_user = await user(db_session)
    service = PersonalTokenService(db_session, "test-key")
    active, _ = await service.create(test_user.id, "Active", ["mcp:read"])
    first, _ = await service.create(test_user.id, "First", ["mcp:read"])
    second, _ = await service.create(test_user.id, "Second", ["mcp:read"])
    await service.revoke(test_user.id, first.id)
    await service.revoke(test_user.id, second.id)

    assert await service.purge_revoked(test_user.id) == 2
    assert await service.authenticate("not-a-token") is None
    assert await db_session.get(McpPersonalAccessToken, active.id) is not None
    assert await db_session.get(McpPersonalAccessToken, first.id) is None


@pytest.mark.asyncio
async def test_mcp_token_verifier_returns_scoped_user_identity(
    db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch
):
    test_user = await user(db_session)
    service = PersonalTokenService(db_session, "test-key")
    _, token = await service.create(
        test_user.id,
        "Codex",
        ["mcp:read", "course:write", "render:submit", "render:read"],
    )

    @asynccontextmanager
    async def test_session_factory():
        yield db_session

    monkeypatch.setattr("app.mcp.auth.async_session_maker", test_session_factory)
    monkeypatch.setattr(settings, "MCP_PAT_SIGNING_KEY", "test-key")

    verifier = PersonalTokenVerifier()
    access_token = await verifier.verify_token(token)
    assert access_token is not None
    assert access_token.subject == str(test_user.id)
    assert access_token.scopes == ["course:write", "mcp:read", "render:read", "render:submit"]
    assert await verifier.verify_token("invalid-token") is None


@pytest.mark.asyncio
async def test_streamable_http_mount_supports_authenticated_legacy_and_modern_protocols(
    db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch
):
    test_user = await user(db_session)
    service = PersonalTokenService(db_session, "http-test-key")
    _, token = await service.create(test_user.id, "HTTP client", ["mcp:read"])

    @asynccontextmanager
    async def test_session_factory():
        yield db_session

    monkeypatch.setattr("app.mcp.auth.async_session_maker", test_session_factory)
    monkeypatch.setattr(settings, "MCP_PAT_SIGNING_KEY", "http-test-key")

    test_app = FastAPI()
    test_app.mount("/mcp", streamable_app())
    legacy_request = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2026-07-28",
            "capabilities": {},
            "clientInfo": {"name": "deployment-check", "version": "1.0"},
        },
    }
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json, text/event-stream",
        "Content-Type": "application/json",
    }
    async with mcp.session_manager.run():
        async with AsyncClient(
            transport=ASGITransport(app=test_app), base_url="http://localhost"
        ) as client:
            legacy_response = await client.post("/mcp/", headers=headers, json=legacy_request)
            modern_response = await client.post(
                "/mcp/",
                headers={
                    **headers,
                    "MCP-Protocol-Version": "2026-07-28",
                    "MCP-Method": "server/discover",
                },
                json={
                    "jsonrpc": "2.0",
                    "id": 2,
                    "method": "server/discover",
                    "params": {
                        "_meta": {
                            "io.modelcontextprotocol/protocolVersion": "2026-07-28",
                            "io.modelcontextprotocol/clientInfo": {
                                "name": "deployment-check",
                                "version": "1.0",
                            },
                            "io.modelcontextprotocol/clientCapabilities": {},
                        }
                    },
                },
            )

    assert legacy_response.status_code == 200
    assert "2025-11-25" in legacy_response.text
    assert modern_response.status_code == 200, modern_response.text
    assert "2026-07-28" in modern_response.text


@pytest.mark.asyncio
async def test_assembly_requires_qa_and_is_idempotent(db_session: AsyncSession):
    test_user = await user(db_session)
    document = {
        "request_id": "batch-c-request",
        "course": {"title": "Generated", "description": "Course"},
        "sections": [
            {
                "id": "section",
                "title": "Section",
                "lessons": [
                    {
                        "id": "lesson",
                        "title": "Lesson",
                        "learning_objectives": ["Learn"],
                        "script": {
                            "narration": "Hello.",
                            "scenes": [{"id": "scene", "type": "text"}],
                        },
                    }
                ],
            }
        ],
    }
    project = ProductionProject(user_id=test_user.id, title="Generated")
    db_session.add(project)
    await db_session.flush()
    spec = ProductionSpecVersion(
        project_id=project.id,
        user_id=test_user.id,
        version=1,
        schema_version="1.0",
        document=document,
        checksum="a" * 64,
        validation_report={},
    )
    db_session.add(spec)
    await db_session.commit()
    pipeline = ProductionPipeline(db_session)
    with pytest.raises(QaGateError):
        await pipeline.assemble(
            user_id=test_user.id,
            project_id=project.id,
            spec_version_id=spec.id,
            qa_report={"status": "failed"},
        )
    qa = {"status": "passed", "lessons": {"lesson": {"duration_seconds": 3}}}
    first = await pipeline.assemble(
        user_id=test_user.id, project_id=project.id, spec_version_id=spec.id, qa_report=qa
    )
    await db_session.commit()
    second = await pipeline.assemble(
        user_id=test_user.id, project_id=project.id, spec_version_id=spec.id, qa_report=qa
    )
    assert first.id == second.id and second.status == "ready" and not second.is_public
