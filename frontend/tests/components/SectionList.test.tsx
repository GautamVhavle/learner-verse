import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi } from "vitest";
import { SectionList } from "@/components/course/SectionList";
import type { Section } from "@/types/section";

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function W({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

// dnd-kit needs this
vi.mock("@dnd-kit/core", async () => {
  const actual = await vi.importActual("@dnd-kit/core");
  return {
    ...actual,
    DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

vi.mock("@dnd-kit/sortable", async () => {
  const actual = await vi.importActual("@dnd-kit/sortable");
  return {
    ...actual,
    SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useSortable: () => ({
      attributes: {},
      listeners: {},
      setNodeRef: vi.fn(),
      transform: null,
      transition: null,
      isDragging: false,
    }),
  };
});

const mockSections: Section[] = [
  {
    id: "s1",
    course_id: "c1",
    title: "Getting Started",
    description: null,
    position: 0,
    lessons: [
      {
        id: "l1",
        section_id: "s1",
        title: "Introduction",
        youtube_url: null,
        youtube_title: null,
        youtube_thumbnail: null,
        youtube_duration: null,
        youtube_channel: null,
        notes_markdown: null,
        position: 0,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
      {
        id: "l2",
        section_id: "s1",
        title: "Setup Guide",
        youtube_url: null,
        youtube_title: null,
        youtube_thumbnail: null,
        youtube_duration: "10:30",
        youtube_channel: null,
        notes_markdown: null,
        position: 1,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
    ],
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "s2",
    course_id: "c1",
    title: "Advanced Topics",
    description: null,
    position: 1,
    lessons: [],
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

const defaultProps = {
  sections: mockSections,
  onAddSection: vi.fn(),
  onUpdateSection: vi.fn(),
  onDeleteSection: vi.fn(),
  onDuplicateSection: vi.fn(),
  onReorderSections: vi.fn(),
  onAddLesson: vi.fn(),
  onUpdateLesson: vi.fn(),
  onDeleteLesson: vi.fn(),
  onDuplicateLesson: vi.fn(),
  onReorderLessons: vi.fn(),
};

describe("SectionList", () => {
  it("renders section titles", () => {
    render(<W><SectionList {...defaultProps} /></W>);
    expect(screen.getByText("Getting Started")).toBeInTheDocument();
    expect(screen.getByText("Advanced Topics")).toBeInTheDocument();
  });

  it("renders lesson titles", () => {
    render(<W><SectionList {...defaultProps} /></W>);
    expect(screen.getByText("Introduction")).toBeInTheDocument();
    expect(screen.getByText("Setup Guide")).toBeInTheDocument();
  });

  it("renders lesson count", () => {
    render(<W><SectionList {...defaultProps} /></W>);
    expect(screen.getByText("2 lessons")).toBeInTheDocument();
    expect(screen.getByText("0 lessons")).toBeInTheDocument();
  });

  it("renders empty state when no sections", () => {
    render(<W><SectionList {...defaultProps} sections={[]} /></W>);
    expect(screen.getByText(/No sections yet/)).toBeInTheDocument();
  });

  it("calls onAddSection when Add Section button clicked", async () => {
    const user = userEvent.setup();
    const onAddSection = vi.fn();
    render(<W><SectionList {...defaultProps} onAddSection={onAddSection} /></W>);
    const addButtons = screen.getAllByRole("button", { name: /Add Section/i });
    await user.click(addButtons[0]);
    expect(onAddSection).toHaveBeenCalled();
  });

  it("renders Add buttons for each section", () => {
    render(<W><SectionList {...defaultProps} /></W>);
    const addLessonButtons = screen.getAllByRole("button", {
      name: /^Add$/i,
    });
    expect(addLessonButtons).toHaveLength(2);
  });

  it("calls onAddLesson with section id when Video Lesson clicked", async () => {
    const user = userEvent.setup();
    const onAddLesson = vi.fn();
    render(<W><SectionList {...defaultProps} onAddLesson={onAddLesson} /></W>);
    const addLessonButtons = screen.getAllByRole("button", {
      name: /^Add$/i,
    });
    await user.click(addLessonButtons[0]);
    const videoOption = await screen.findByText("Video Lesson");
    await user.click(videoOption);
    expect(onAddLesson).toHaveBeenCalledWith("s1", "video");
  });

  it("shows duration badge on lesson", () => {
    render(<W><SectionList {...defaultProps} /></W>);
    expect(screen.getByText("10:30")).toBeInTheDocument();
  });

  it("shows empty lessons placeholder for section with no lessons", () => {
    render(<W><SectionList {...defaultProps} /></W>);
    expect(screen.getByText("No lessons yet")).toBeInTheDocument();
  });
});
