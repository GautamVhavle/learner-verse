import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ isSignedIn: true }),
}));

vi.mock("@/lib/auth", () => ({ SINGLE_USER_MODE: false }));

import { McpShowcase } from "@/components/home/McpShowcase";

describe("McpShowcase", () => {
  it("explains the secure IDE-to-course workflow", () => {
    render(
      <MemoryRouter>
        <McpShowcase />
      </MemoryRouter>,
    );

    expect(screen.getByText("Model Context Protocol")).toBeInTheDocument();
    expect(screen.getByText("get_capabilities")).toBeInTheDocument();
    expect(screen.getByText("validate_course_spec")).toBeInTheDocument();
    expect(screen.getByText("build_course_from_spec")).toBeInTheDocument();
    expect(screen.getByText("get_course_for_review")).toBeInTheDocument();
    expect(screen.getByText("Nothing publishes until you approve it")).toBeInTheDocument();
    expect(screen.getByText("Codex")).toBeInTheDocument();
  });

  it("opens the signed-in MCP setup guide", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<McpShowcase />} />
          <Route path="/creator/mcp" element={<div>MCP setup guide</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Connect your IDE" }));
    expect(screen.getByText("MCP setup guide")).toBeInTheDocument();
  });
});
