import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { StudySidebar } from "@/components/study/StudySidebar";
import type { Section } from "@/types/section";

const mockSections: Section[] = [
  {
    id: "s1",
    course_id: "c1",
    title: "Introduction",
    description: null,
    position: 0,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    lessons: [
      {
        id: "l1",
        section_id: "s1",
        title: "Welcome",
        youtube_url: "https://youtu.be/abc",
        youtube_title: null,
        youtube_thumbnail: null,
        youtube_duration: null,
        youtube_channel: null,
        notes_markdown: null,
        reference_links: [],
        position: 0,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
      {
        id: "l2",
        section_id: "s1",
        title: "Getting Started",
        youtube_url: null,
        youtube_title: null,
        youtube_thumbnail: null,
        youtube_duration: null,
        youtube_channel: null,
        notes_markdown: "# Notes",
        reference_links: [],
        position: 1,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
    ],
  },
  {
    id: "s2",
    course_id: "c1",
    title: "Advanced Topics",
    description: null,
    position: 1,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    lessons: [],
  },
];

describe("StudySidebar", () => {
  it("renders section titles", () => {
    render(
      <StudySidebar
        sections={mockSections}
        selectedLessonId={null}
        onSelectLesson={vi.fn()}
      />,
    );
    expect(screen.getByText("Introduction")).toBeInTheDocument();
    expect(screen.getByText("Advanced Topics")).toBeInTheDocument();
  });

  it("shows completion count per section", () => {
    render(
      <StudySidebar
        sections={mockSections}
        selectedLessonId={null}
        onSelectLesson={vi.fn()}
        lessonProgress={{ l1: true, l2: false }}
      />,
    );
    expect(screen.getByText("1/2")).toBeInTheDocument(); // Introduction: 1 of 2
    expect(screen.getByText("0")).toBeInTheDocument(); // Advanced: 0 lessons
  });

  it("calls onSelectLesson when a lesson is clicked", () => {
    const onSelect = vi.fn();
    render(
      <StudySidebar
        sections={mockSections}
        selectedLessonId="l1"
        onSelectLesson={onSelect}
      />,
    );
    fireEvent.click(screen.getByText("Getting Started"));
    expect(onSelect).toHaveBeenCalledWith("l2");
  });

  it("auto-expands section containing selected lesson", () => {
    render(
      <StudySidebar
        sections={mockSections}
        selectedLessonId="l1"
        onSelectLesson={vi.fn()}
      />,
    );
    expect(screen.getByText("Welcome")).toBeInTheDocument();
    expect(screen.getByText("Getting Started")).toBeInTheDocument();
  });

  it("shows checkmarks for completed lessons", () => {
    const { container } = render(
      <StudySidebar
        sections={mockSections}
        selectedLessonId="l2"
        onSelectLesson={vi.fn()}
        lessonProgress={{ l1: true, l2: false }}
      />,
    );
    // l1 is completed — should show strikethrough
    const l1Button = screen.getByText("Welcome");
    expect(l1Button.className).toContain("line-through");
  });
});
