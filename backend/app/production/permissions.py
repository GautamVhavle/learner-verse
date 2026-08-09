"""Scopes shared by REST, MCP adapters, and production services."""

from __future__ import annotations

from enum import StrEnum


class Scope(StrEnum):
    MCP_READ = "mcp:read"
    COURSE_WRITE = "course:write"
    ASSET_READ = "asset:read"
    ASSET_WRITE = "asset:write"
    RENDER_SUBMIT = "render:submit"
    RENDER_READ = "render:read"
    RENDER_CANCEL = "render:cancel"
    COURSE_PUBLISH = "course:publish"
    TOKEN_MANAGE = "token:manage"
    CREDENTIAL_MANAGE = "credential:manage"


def require_scopes(granted: set[str], *required: Scope) -> None:
    missing = [scope.value for scope in required if scope.value not in granted]
    if missing:
        raise PermissionError(f"missing required scopes: {', '.join(missing)}")
