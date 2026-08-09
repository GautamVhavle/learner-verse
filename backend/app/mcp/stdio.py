"""Local IDE entry point. MCP SDK owns stdout framing; application code never prints."""

from app.core.config import settings
from app.mcp.server import mcp

if __name__ == "__main__":
    if not settings.MCP_ENABLED or not settings.MCP_STDIO_ENABLED:
        raise SystemExit("MCP stdio is disabled by release controls.")
    mcp.run("stdio")
