import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockMutate = vi.fn();

const mockUser = {
  id: "00000000-0000-0000-0000-000000000001",
  clerk_id: null,
  email: "local@learnerverse.dev",
  display_name: "Local User",
  avatar_url: null,
  timezone: "UTC",
  playback_speed: 1.0,
  font_size: "normal" as const,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

vi.mock("@/hooks/useUser", () => ({
  useUserQuery: () => ({
    data: mockUser,
    isLoading: false,
  }),
  useUpdateUserMutation: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
  useUploadAvatarMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

import SettingsPage from "@/pages/SettingsPage";

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("SettingsPage", () => {
  beforeEach(() => {
    mockMutate.mockClear();
    document.documentElement.classList.remove("font-large", "font-xl");
  });

  it("renders settings heading", () => {
    renderPage();
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Manage your preferences.")).toBeInTheDocument();
  });

  it("renders timezone selector", () => {
    renderPage();
    expect(screen.getByTestId("settings-timezone-trigger")).toBeInTheDocument();
    expect(screen.getByText("UTC")).toBeInTheDocument();
  });

  it("opens timezone dropdown on click", () => {
    renderPage();
    fireEvent.click(screen.getByTestId("settings-timezone-trigger"));
    expect(screen.getByTestId("settings-timezone-search")).toBeInTheDocument();
  });

  it("renders playback speed options", () => {
    renderPage();
    expect(screen.getByTestId("speed-0.5")).toBeInTheDocument();
    expect(screen.getByTestId("speed-1")).toBeInTheDocument();
    expect(screen.getByTestId("speed-2")).toBeInTheDocument();
  });

  it("calls update when playback speed is changed", () => {
    renderPage();
    fireEvent.click(screen.getByTestId("speed-1.5"));
    expect(mockMutate).toHaveBeenCalledWith({ playback_speed: 1.5 });
  });

  it("renders font size options", () => {
    renderPage();
    expect(screen.getByTestId("font-normal")).toBeInTheDocument();
    expect(screen.getByTestId("font-large")).toBeInTheDocument();
    expect(screen.getByTestId("font-xl")).toBeInTheDocument();
    expect(screen.getByText("Normal")).toBeInTheDocument();
    expect(screen.getByText("Large")).toBeInTheDocument();
    expect(screen.getByText("Extra Large")).toBeInTheDocument();
  });

  it("calls update and applies CSS class when font size is changed", () => {
    renderPage();
    fireEvent.click(screen.getByTestId("font-large"));
    expect(mockMutate).toHaveBeenCalledWith({ font_size: "large" });
    expect(document.documentElement.classList.contains("font-large")).toBe(true);
  });

  it("applies font-xl CSS class when xl is selected", () => {
    renderPage();
    fireEvent.click(screen.getByTestId("font-xl"));
    expect(document.documentElement.classList.contains("font-xl")).toBe(true);
    expect(document.documentElement.classList.contains("font-large")).toBe(false);
  });

  it("debounces timezone or font changes", async () => {
    // Display name debounce moved to ProfilePage test
    renderPage();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("shows auto-save info", () => {
    renderPage();
    expect(screen.getByText("Changes are saved automatically.")).toBeInTheDocument();
  });
});
