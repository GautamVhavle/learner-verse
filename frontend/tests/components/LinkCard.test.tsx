import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { LinkCard } from "@/components/lesson/LinkCard";
import type { ReferenceLink } from "@/types/section";

const mockLink: ReferenceLink = {
  id: "link-1",
  lesson_id: "lesson-1",
  url: "https://example.com/article",
  title: "Example Article",
  description: "A great article about testing",
  image: "https://example.com/image.jpg",
  favicon: "https://example.com/favicon.ico",
  domain: "example.com",
  position: 0,
  created_at: "2024-01-01T00:00:00Z",
};

describe("LinkCard", () => {
  it("renders link title", () => {
    render(<LinkCard link={mockLink} />);
    expect(screen.getByText("Example Article")).toBeInTheDocument();
  });

  it("renders link description", () => {
    render(<LinkCard link={mockLink} />);
    expect(
      screen.getByText("A great article about testing")
    ).toBeInTheDocument();
  });

  it("renders domain", () => {
    render(<LinkCard link={mockLink} />);
    expect(screen.getByText("example.com")).toBeInTheDocument();
  });

  it("links to the URL", () => {
    render(<LinkCard link={mockLink} />);
    const link = screen.getByText("Example Article").closest("a");
    expect(link).toHaveAttribute("href", "https://example.com/article");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("falls back to URL when no title", () => {
    const noTitle = { ...mockLink, title: null };
    render(<LinkCard link={noTitle} />);
    expect(
      screen.getByText("https://example.com/article")
    ).toBeInTheDocument();
  });

  it("shows remove button when onRemove provided", () => {
    const onRemove = vi.fn();
    const { container } = render(
      <LinkCard link={mockLink} onRemove={onRemove} />
    );
    // The remove button exists (hidden until hover via opacity)
    const btn = container.querySelector("button");
    expect(btn).toBeInTheDocument();
  });

  it("calls onRemove when clicked", () => {
    const onRemove = vi.fn();
    const { container } = render(
      <LinkCard link={mockLink} onRemove={onRemove} />
    );
    const btn = container.querySelector("button");
    if (btn) fireEvent.click(btn);
    expect(onRemove).toHaveBeenCalled();
  });

  it("hides remove button in readonly mode", () => {
    const { container } = render(
      <LinkCard link={mockLink} onRemove={vi.fn()} readonly />
    );
    expect(container.querySelector("button")).not.toBeInTheDocument();
  });
});
