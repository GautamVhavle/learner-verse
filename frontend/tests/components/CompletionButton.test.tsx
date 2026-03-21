import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

const mockMutate = vi.fn();

vi.mock("@/hooks/useProgress", () => ({
  useToggleProgressMutation: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

vi.mock("@/hooks/useKeyboardShortcuts", () => ({
  useKeyboardShortcuts: vi.fn(),
}));

import { CompletionButton } from "@/components/study/CompletionButton";

describe("CompletionButton", () => {
  it("renders 'Mark Complete' when not completed", () => {
    render(<CompletionButton lessonId="l1" completed={false} />);
    expect(screen.getByText("Mark Complete")).toBeInTheDocument();
  });

  it("renders 'Completed' when completed", () => {
    render(<CompletionButton lessonId="l1" completed={true} />);
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("calls toggle mutation when clicked (mark complete)", () => {
    render(<CompletionButton lessonId="l1" completed={false} />);
    fireEvent.click(screen.getByText("Mark Complete"));
    expect(mockMutate).toHaveBeenCalledWith(
      { lessonId: "l1", data: { completed: true } },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it("calls toggle mutation when clicked (mark incomplete)", () => {
    mockMutate.mockClear();
    render(<CompletionButton lessonId="l1" completed={true} />);
    fireEvent.click(screen.getByText("Completed"));
    expect(mockMutate).toHaveBeenCalledWith(
      { lessonId: "l1", data: { completed: false } },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });
});
