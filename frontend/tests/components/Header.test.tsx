import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router";

vi.mock("@/stores/modeStore", () => ({
  useModeStore: () => ({
    mode: "creator",
    toggleMode: vi.fn(),
    setMode: vi.fn(),
  }),
}));

vi.mock("@/components/ui/sidebar", () => ({
  SidebarTrigger: () => <button data-testid="sidebar-trigger">Toggle</button>,
  useSidebar: () => ({ state: "expanded", isMobile: false }),
}));

import { Header } from "@/components/layout/Header";

describe("Header", () => {
  it("renders the current page title from route", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Header />
      </MemoryRouter>,
    );
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("shows mode label in breadcrumb", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Header />
      </MemoryRouter>,
    );
    expect(screen.getByText("Creator")).toBeInTheDocument();
  });

  it("renders sidebar trigger button", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Header />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("sidebar-trigger")).toBeInTheDocument();
  });

  it("has the header test id", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Header />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("app-header")).toBeInTheDocument();
  });
});
