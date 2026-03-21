import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MarkdownRenderer } from "@/components/lesson/MarkdownRenderer";

describe("MarkdownRenderer", () => {
  it("renders markdown headings", () => {
    render(<MarkdownRenderer content="# Hello World" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Hello World"
    );
  });

  it("renders bold text", () => {
    render(<MarkdownRenderer content="**bold**" />);
    expect(screen.getByText("bold")).toBeInTheDocument();
    expect(screen.getByText("bold").tagName).toBe("STRONG");
  });

  it("renders links", () => {
    render(<MarkdownRenderer content="[Click](https://example.com)" />);
    const link = screen.getByText("Click");
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute("href", "https://example.com");
  });

  it("renders unordered lists", () => {
    render(<MarkdownRenderer content={"- Item A\n- Item B"} />);
    expect(screen.getByText("Item A")).toBeInTheDocument();
    expect(screen.getByText("Item B")).toBeInTheDocument();
  });

  it("renders code blocks", () => {
    render(<MarkdownRenderer content={"`inline code`"} />);
    expect(screen.getByText("inline code")).toBeInTheDocument();
    expect(screen.getByText("inline code").tagName).toBe("CODE");
  });

  it("wraps content in markdown-body class", () => {
    const { container } = render(
      <MarkdownRenderer content="Hello" />
    );
    expect(container.querySelector(".markdown-body")).toBeInTheDocument();
  });
});
