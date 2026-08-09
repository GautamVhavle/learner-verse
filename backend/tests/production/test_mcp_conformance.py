import pytest
from mcp import Client
from app.mcp.server import mcp


@pytest.mark.asyncio
async def test_current_and_legacy_mcp_discover_tools_resources():
    async with Client(mcp, mode="auto") as client:
        assert client.protocol_version == "2026-07-28"
        tools = await client.list_tools()
        resources = await client.list_resources()
        assert "validate_course_spec" in [tool.name for tool in tools.tools]
        assert "LearnerVerse workflow" in [resource.name for resource in resources.resources]
    async with Client(mcp, mode="legacy") as client:
        assert client.protocol_version == "2025-11-25"
        tools = await client.list_tools()
        assert "get_capabilities" in [tool.name for tool in tools.tools]
