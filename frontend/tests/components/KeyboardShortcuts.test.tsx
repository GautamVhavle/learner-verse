import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { KeyboardShortcuts } from "@/components/shared/KeyboardShortcuts";

describe("KeyboardShortcuts", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <KeyboardShortcuts open={false} onOpenChange={vi.fn()} />,
    );
    expect(container.textContent).toBe("");
  });

  it("renders title when open", () => {
    render(<KeyboardShortcuts open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();
  });

  it("renders description", () => {
    render(<KeyboardShortcuts open={true} onOpenChange={vi.fn()} />);
    expect(
      screen.getByText("Navigate faster with these shortcuts."),
    ).toBeInTheDocument();
  });

  it("renders Global shortcut group", () => {
    render(<KeyboardShortcuts open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText("Global")).toBeInTheDocument();
    expect(screen.getByText("Open search")).toBeInTheDocument();
    expect(
      screen.getByText("Toggle Creator / Learner mode"),
    ).toBeInTheDocument();
    expect(screen.getByText("Show keyboard shortcuts")).toBeInTheDocument();
    expect(
      screen.getByText("Close modal / exit focus mode"),
    ).toBeInTheDocument();
  });

  it("renders Study View shortcut group", () => {
    render(<KeyboardShortcuts open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText("Study View")).toBeInTheDocument();
    expect(screen.getByText("Toggle focus mode")).toBeInTheDocument();
    expect(
      screen.getByText("Mark lesson complete / incomplete"),
    ).toBeInTheDocument();
  });

  it("renders Course Builder shortcut group", () => {
    render(<KeyboardShortcuts open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText("Course Builder")).toBeInTheDocument();
    expect(screen.getByText("Force save")).toBeInTheDocument();
    expect(screen.getByText("New course")).toBeInTheDocument();
  });

  it("shows ⌘ for Ctrl keys", () => {
    render(<KeyboardShortcuts open={true} onOpenChange={vi.fn()} />);
    const cmdKeys = screen.getAllByText("⌘");
    expect(cmdKeys.length).toBeGreaterThan(0);
  });

  it("shows keyboard key badges (Kbd)", () => {
    render(<KeyboardShortcuts open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText("K")).toBeInTheDocument();
    expect(screen.getByText("F")).toBeInTheDocument();
    expect(screen.getByText("M")).toBeInTheDocument();
    // N appears in both "Next lesson" and "New course (Ctrl+N)"
    expect(screen.getAllByText("N").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("P")).toBeInTheDocument();
    expect(screen.getByText("S")).toBeInTheDocument();
    expect(screen.getByText("Esc")).toBeInTheDocument();
  });
});
