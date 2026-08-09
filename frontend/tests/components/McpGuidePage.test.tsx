import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiGet = vi.fn();
const apiPost = vi.fn();
const apiDelete = vi.fn();

vi.mock("@/lib/api", () => ({
  API_BASE_URL: "http://localhost:8001/api/v1",
  api: {
    get: (...args: unknown[]) => apiGet(...args),
    post: (...args: unknown[]) => apiPost(...args),
    delete: (...args: unknown[]) => apiDelete(...args),
  },
}));

import McpGuidePage from "@/pages/McpGuidePage";

describe("McpGuidePage", () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiPost.mockReset();
    apiDelete.mockReset();
    apiGet.mockImplementation((path: string) => {
      if (path === "/mcp-settings/tokens") return Promise.resolve([]);
      return Promise.resolve({
        mcp_url: "/mcp",
        oauth_configured: false,
        personal_tokens_enabled: true,
        user_id: "user-1",
      });
    });
  });

  it("documents the complete MCP surface and client options", async () => {
    render(<McpGuidePage />);

    expect(
      screen.getByRole("heading", { name: "Build complete courses from your IDE" }),
    ).toBeInTheDocument();
    expect(screen.getByText("get_capabilities")).toBeInTheDocument();
    expect(screen.getAllByText("validate_course_spec").length).toBeGreaterThan(0);
    expect(screen.getByText("build_course_from_spec")).toBeInTheDocument();
    expect(screen.getByText("get_job")).toBeInTheDocument();
    expect(screen.getByText("cancel_job")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "VS Code" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Claude Code" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cursor" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "OpenCode" })).toBeInTheDocument();

    await waitFor(() => expect(apiGet).toHaveBeenCalledTimes(2));
  });

  it("creates a copy-once token with the recommended scopes", async () => {
    apiPost.mockResolvedValue({
      id: "token-1",
      token: "lvmcp_secret",
      token_prefix: "lvmcp_abcd",
      scopes: ["mcp:read", "course:write", "render:submit", "render:read", "render:cancel"],
    });
    render(<McpGuidePage />);

    fireEvent.click(screen.getByRole("button", { name: "Generate personal API key" }));

    await waitFor(() =>
      expect(apiPost).toHaveBeenCalledWith("/mcp-settings/tokens", {
        name: "Course builder IDE",
        scopes: ["mcp:read", "course:write", "render:submit", "render:read", "render:cancel"],
      }),
    );
    expect(await screen.findByText("lvmcp_secret")).toBeInTheDocument();
    expect(screen.getByText("Copy this key now")).toBeInTheDocument();
  });

  it("permanently deletes revoked keys while active keys remain revocable", async () => {
    apiGet.mockImplementation((path: string) => {
      if (path === "/mcp-settings/tokens") {
        return Promise.resolve([
          {
            id: "active-1",
            name: "Active IDE",
            token_prefix: "lvmcp_active",
            scopes: ["mcp:read"],
            expires_at: null,
            last_used_at: null,
            created_at: "2026-08-10T00:00:00Z",
            revoked: false,
          },
          {
            id: "revoked-1",
            name: "Old test key",
            token_prefix: "lvmcp_revoked",
            scopes: ["mcp:read"],
            expires_at: null,
            last_used_at: null,
            created_at: "2026-08-09T00:00:00Z",
            revoked: true,
          },
        ]);
      }
      return Promise.resolve({ personal_tokens_enabled: true });
    });
    apiDelete.mockResolvedValue({ deleted: true });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<McpGuidePage />);

    expect(await screen.findByRole("button", { name: "Revoke" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() =>
      expect(apiDelete).toHaveBeenCalledWith("/mcp-settings/tokens/revoked-1/permanent"),
    );
    expect(screen.queryByText("Old test key")).not.toBeInTheDocument();
    expect(screen.getByText("Active IDE")).toBeInTheDocument();
  });
});
