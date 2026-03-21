import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockMutate = vi.fn();

vi.mock("@/hooks/useUser", () => ({
  useUpdateUserMutation: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

import OnboardingPage from "@/pages/OnboardingPage";

describe("OnboardingPage", () => {
  const onComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderPage() {
    return render(<OnboardingPage onComplete={onComplete} />);
  }

  it("renders welcome step initially", () => {
    renderPage();
    expect(screen.getByTestId("onboarding-title")).toHaveTextContent(
      "Welcome to Learner Verse",
    );
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
  });

  it("shows feature list on welcome step", () => {
    renderPage();
    expect(
      screen.getByText("Import YouTube playlists as courses"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Set goals and track your learning pace"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Earn certificates on completion"),
    ).toBeInTheDocument();
  });

  it("navigates to second step on Next", () => {
    renderPage();
    fireEvent.click(screen.getByTestId("onboarding-next"));
    expect(screen.getByTestId("onboarding-title")).toHaveTextContent(
      "Your Dashboard",
    );
    expect(screen.getByText("Step 2 of 3")).toBeInTheDocument();
  });

  it("navigates through all steps", () => {
    renderPage();
    // Step 1 → 2
    fireEvent.click(screen.getByTestId("onboarding-next"));
    expect(screen.getByTestId("onboarding-title")).toHaveTextContent(
      "Your Dashboard",
    );
    // Step 2 → 3
    fireEvent.click(screen.getByTestId("onboarding-next"));
    expect(screen.getByTestId("onboarding-title")).toHaveTextContent(
      "Two Modes, One App",
    );
    expect(screen.getByText("Step 3 of 3")).toBeInTheDocument();
  });

  it("shows Get Started button on last step", () => {
    renderPage();
    fireEvent.click(screen.getByTestId("onboarding-next"));
    fireEvent.click(screen.getByTestId("onboarding-next"));
    expect(screen.getByTestId("onboarding-next")).toHaveTextContent(
      "Get Started",
    );
  });

  it("calls mutate with onboarding_complete on Get Started", () => {
    renderPage();
    fireEvent.click(screen.getByTestId("onboarding-next"));
    fireEvent.click(screen.getByTestId("onboarding-next"));
    fireEvent.click(screen.getByTestId("onboarding-next"));
    expect(mockMutate).toHaveBeenCalledWith(
      { onboarding_complete: true },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it("skip button calls mutate with onboarding_complete", () => {
    renderPage();
    fireEvent.click(screen.getByTestId("onboarding-skip"));
    expect(mockMutate).toHaveBeenCalledWith(
      { onboarding_complete: true },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it("has step indicator dots", () => {
    renderPage();
    const container = screen.getByTestId("onboarding");
    // 3 step dots
    const dots = container.querySelectorAll(".rounded-full");
    expect(dots.length).toBe(3);
  });
});
