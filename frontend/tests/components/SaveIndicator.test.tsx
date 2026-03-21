import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SaveIndicator } from "@/components/shared/SaveIndicator";

describe("SaveIndicator", () => {
  it("renders nothing for idle state", () => {
    const { container } = render(<SaveIndicator status="idle" />);
    expect(container.textContent).toBe("");
  });

  it("shows saving text", () => {
    render(<SaveIndicator status="saving" />);
    expect(screen.getByText("Saving…")).toBeInTheDocument();
  });

  it("shows saved text", () => {
    render(<SaveIndicator status="saved" />);
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });

  it("shows error text", () => {
    render(<SaveIndicator status="error" />);
    expect(screen.getByText("Save failed")).toBeInTheDocument();
  });
});
