import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { FocusOverlay } from "@/components/study/FocusOverlay";

describe("FocusOverlay", () => {
  const defaultProps = {
    onExit: vi.fn(),
    onShowShortcuts: vi.fn(),
  };

  it("renders exit button", () => {
    render(<FocusOverlay {...defaultProps} />);
    expect(
      screen.getByTitle("Exit focus mode (F / Esc)"),
    ).toBeInTheDocument();
  });

  it("renders shortcuts button", () => {
    render(<FocusOverlay {...defaultProps} />);
    expect(
      screen.getByTitle("Keyboard shortcuts (?)"),
    ).toBeInTheDocument();
  });

  it("shows lesson title when provided", () => {
    render(<FocusOverlay {...defaultProps} lessonTitle="Intro to React" />);
    expect(screen.getByText("Intro to React")).toBeInTheDocument();
  });

  it("does not show title when not provided", () => {
    render(<FocusOverlay {...defaultProps} />);
    expect(screen.queryByText("Intro to React")).not.toBeInTheDocument();
  });

  it("calls onExit when exit button clicked", () => {
    const onExit = vi.fn();
    render(<FocusOverlay {...defaultProps} onExit={onExit} />);
    fireEvent.click(screen.getByTitle("Exit focus mode (F / Esc)"));
    expect(onExit).toHaveBeenCalledOnce();
  });

  it("calls onShowShortcuts when shortcuts button clicked", () => {
    const onShowShortcuts = vi.fn();
    render(
      <FocusOverlay {...defaultProps} onShowShortcuts={onShowShortcuts} />,
    );
    fireEvent.click(screen.getByTitle("Keyboard shortcuts (?)"));
    expect(onShowShortcuts).toHaveBeenCalledOnce();
  });

  it("calls onPrev when previous button clicked", () => {
    const onPrev = vi.fn();
    render(<FocusOverlay {...defaultProps} onPrev={onPrev} />);
    fireEvent.click(screen.getByTitle("Previous lesson (P / ←)"));
    expect(onPrev).toHaveBeenCalledOnce();
  });

  it("calls onNext when next button clicked", () => {
    const onNext = vi.fn();
    render(<FocusOverlay {...defaultProps} onNext={onNext} />);
    fireEvent.click(screen.getByTitle("Next lesson (N / →)"));
    expect(onNext).toHaveBeenCalledOnce();
  });

  it("disables prev button when onPrev not provided", () => {
    render(<FocusOverlay {...defaultProps} />);
    expect(screen.getByTitle("Previous lesson (P / ←)")).toBeDisabled();
  });

  it("disables next button when onNext not provided", () => {
    render(<FocusOverlay {...defaultProps} />);
    expect(screen.getByTitle("Next lesson (N / →)")).toBeDisabled();
  });

  it("enables prev button when onPrev provided", () => {
    render(<FocusOverlay {...defaultProps} onPrev={vi.fn()} />);
    expect(screen.getByTitle("Previous lesson (P / ←)")).not.toBeDisabled();
  });

  it("enables next button when onNext provided", () => {
    render(<FocusOverlay {...defaultProps} onNext={vi.fn()} />);
    expect(screen.getByTitle("Next lesson (N / →)")).not.toBeDisabled();
  });
});
