import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ValidationErrorsDialog } from "@/components/course/ValidationErrorsDialog";
import type { ValidationError } from "@/types/course";

const errors: ValidationError[] = [
  { section: "Section 1", lesson: "Lesson A", message: "No content found" },
  { section: "Section 2", lesson: null, message: "Section has no lessons" },
];

describe("ValidationErrorsDialog", () => {
  it("does not show errors when not open", () => {
    render(
      <ValidationErrorsDialog
        open={false}
        onOpenChange={vi.fn()}
        errors={errors}
      />,
    );
    expect(screen.queryByText("Cannot Mark as Ready")).not.toBeInTheDocument();
  });

  it("renders title and errors when open", () => {
    render(
      <ValidationErrorsDialog open onOpenChange={vi.fn()} errors={errors} />,
    );
    expect(screen.getByText("Cannot Mark as Ready")).toBeInTheDocument();
    expect(screen.getByText(/No content found/)).toBeInTheDocument();
    expect(screen.getByText(/Section has no lessons/)).toBeInTheDocument();
  });

  it("shows section and lesson path", () => {
    render(
      <ValidationErrorsDialog open onOpenChange={vi.fn()} errors={errors} />,
    );
    expect(screen.getByText(/Section 1/)).toBeInTheDocument();
    expect(screen.getByText(/Lesson A/)).toBeInTheDocument();
    expect(screen.getByText(/Section 2/)).toBeInTheDocument();
  });

  it("calls onOpenChange when dismiss button clicked", () => {
    const onOpenChange = vi.fn();
    render(
      <ValidationErrorsDialog open onOpenChange={onOpenChange} errors={errors} />,
    );
    fireEvent.click(screen.getByText("Got it"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
