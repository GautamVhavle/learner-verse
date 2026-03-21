import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { EmptyState } from "@/components/shared/EmptyState";
import userEvent from "@testing-library/user-event";

describe("EmptyState", () => {
  it("renders title and description", () => {
    render(
      <EmptyState
        title="Nothing here"
        description="Start by creating something"
      />,
    );
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(
      screen.getByText("Start by creating something"),
    ).toBeInTheDocument();
  });

  it("renders action button when provided", () => {
    const onAction = vi.fn();
    render(
      <EmptyState
        title="Empty"
        description="Desc"
        actionLabel="Create"
        onAction={onAction}
      />,
    );
    expect(screen.getByText("Create")).toBeInTheDocument();
  });

  it("calls onAction when button clicked", async () => {
    const onAction = vi.fn();
    render(
      <EmptyState
        title="Empty"
        description="Desc"
        actionLabel="Create"
        onAction={onAction}
      />,
    );
    await userEvent.click(screen.getByText("Create"));
    expect(onAction).toHaveBeenCalledOnce();
  });

  it("does not render button when no actionLabel", () => {
    render(<EmptyState title="Empty" description="Desc" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders secondary action button", async () => {
    const secondary = vi.fn();
    render(
      <EmptyState
        title="Empty"
        description="Desc"
        secondaryLabel="Cancel"
        onSecondary={secondary}
      />,
    );
    await userEvent.click(screen.getByText("Cancel"));
    expect(secondary).toHaveBeenCalledOnce();
  });

  it("has data-testid empty-state", () => {
    render(<EmptyState title="T" description="D" />);
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
  });

  it("applies compact mode styling", () => {
    render(<EmptyState title="T" description="D" compact />);
    const el = screen.getByTestId("empty-state");
    expect(el.className).toContain("py-12");
    expect(el.className).not.toContain("min-h-");
  });
});
