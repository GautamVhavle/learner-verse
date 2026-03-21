import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/lib/auth", () => ({
  SINGLE_USER_MODE: true,
  SINGLE_USER: {
    id: "00000000-0000-0000-0000-000000000001",
    email: "local@learnerverse.dev",
    displayName: "Local User",
    avatarUrl: null,
  },
  CLERK_PUBLISHABLE_KEY: "",
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/stores/modeStore", () => ({
  useModeStore: () => ({
    mode: "student",
    toggleMode: vi.fn(),
    setMode: vi.fn(),
  }),
}));

import DashboardPage from "@/pages/DashboardPage";

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("DashboardPage", () => {
  it("renders learner library in learner mode", () => {
    renderWithProviders(<DashboardPage />);
    expect(screen.getByText("My Learning")).toBeInTheDocument();
    expect(
      screen.getByText("Track your progress and pick up where you left off."),
    ).toBeInTheDocument();
  });
});
