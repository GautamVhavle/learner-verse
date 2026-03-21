import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MarkdownEditor } from "@/components/lesson/MarkdownEditor";

describe("MarkdownEditor", () => {
  it("renders textarea with value", () => {
    render(<MarkdownEditor value="# Hello" onChange={vi.fn()} />);
    const textarea = screen.getByPlaceholderText(
      "Write your notes in markdown..."
    );
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveValue("# Hello");
  });

  it("calls onChange when typing", () => {
    const onChange = vi.fn();
    render(<MarkdownEditor value="" onChange={onChange} />);
    const textarea = screen.getByPlaceholderText(
      "Write your notes in markdown..."
    );
    fireEvent.change(textarea, { target: { value: "New text" } });
    expect(onChange).toHaveBeenCalledWith("New text");
  });

  it("shows character count", () => {
    render(<MarkdownEditor value="Hello" onChange={vi.fn()} />);
    expect(screen.getByText(/5/)).toBeInTheDocument();
  });

  it("switches to preview mode", () => {
    render(
      <MarkdownEditor value="**bold text**" onChange={vi.fn()} />
    );
    fireEvent.click(screen.getByText("Preview"));
    expect(screen.getByText("bold text")).toBeInTheDocument();
  });

  it("shows empty preview message", () => {
    render(<MarkdownEditor value="" onChange={vi.fn()} />);
    fireEvent.click(screen.getByText("Preview"));
    expect(screen.getByText("Nothing to preview")).toBeInTheDocument();
  });

  it("calls onBlur", () => {
    const onBlur = vi.fn();
    render(<MarkdownEditor value="test" onChange={vi.fn()} onBlur={onBlur} />);
    const textarea = screen.getByPlaceholderText(
      "Write your notes in markdown..."
    );
    fireEvent.blur(textarea);
    expect(onBlur).toHaveBeenCalled();
  });

  it("enforces max length", () => {
    const onChange = vi.fn();
    const longText = "x".repeat(50_001);
    render(<MarkdownEditor value="" onChange={onChange} />);
    const textarea = screen.getByPlaceholderText(
      "Write your notes in markdown..."
    );
    fireEvent.change(textarea, { target: { value: longText } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("has write, preview, and split buttons", () => {
    render(<MarkdownEditor value="" onChange={vi.fn()} />);
    expect(screen.getByText("Write")).toBeInTheDocument();
    expect(screen.getByText("Preview")).toBeInTheDocument();
    expect(screen.getByText("Split")).toBeInTheDocument();
  });
});
