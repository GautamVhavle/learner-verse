import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockOnToggle = vi.fn();
let mockMode = "creator";

vi.mock("@/hooks/useMode", () => ({
  useMode: () => ({
    mode: mockMode,
    toggleMode: vi.fn(),
    setMode: vi.fn(),
    isCreator: mockMode === "creator",
    isLearner: mockMode === "student",
  }),
}));

vi.mock("@/components/ui/sidebar", () => ({
  SidebarMenu: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarMenuItem: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  useSidebar: () => ({ state: "expanded", isMobile: false }),
}));

vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  TooltipTrigger: ({ children, ...props }: Record<string, unknown>) => (
    <button {...props}>{children as React.ReactNode}</button>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

import { ModeToggle } from "@/components/layout/ModeToggle";

describe("ModeToggle", () => {
  beforeEach(() => {
    mockMode = "creator";
    mockOnToggle.mockClear();
  });

  it("renders Creator label when in creator mode", () => {
    render(<ModeToggle onToggle={mockOnToggle} />);
    expect(screen.getByText("Creator")).toBeInTheDocument();
  });

  it("calls onToggle on click", () => {
    render(<ModeToggle onToggle={mockOnToggle} />);
    fireEvent.click(screen.getByTestId("mode-toggle"));
    expect(mockOnToggle).toHaveBeenCalledTimes(1);
  });

  it("renders Learner label when in learner mode", () => {
    mockMode = "student";
    render(<ModeToggle onToggle={mockOnToggle} />);
    expect(screen.getByText("Learner")).toBeInTheDocument();
  });

  it("shows keyboard shortcut hint", () => {
    render(<ModeToggle onToggle={mockOnToggle} />);
    // jsdom reports non-Mac platform, so modifier renders as Ctrl+Shift
    expect(screen.getByText(/to switch/)).toBeInTheDocument();
  });
});
