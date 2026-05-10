import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

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

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Header", () => {
  it("renders the current page title from route", () => {
    renderWithProviders(<Header />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("shows mode label in breadcrumb", () => {
    renderWithProviders(<Header />);
    expect(screen.getByText("Creator")).toBeInTheDocument();
  });

  it("renders sidebar trigger button", () => {
    renderWithProviders(<Header />);
    expect(screen.getByTestId("sidebar-trigger")).toBeInTheDocument();
  });

  it("has the header test id", () => {
    renderWithProviders(<Header />);
    expect(screen.getByTestId("app-header")).toBeInTheDocument();
  });
});
