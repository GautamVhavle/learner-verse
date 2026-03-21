import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router";

const mockNavigate = vi.fn();

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: "course-1" }),
  };
});

let mockCourse: Record<string, unknown> | undefined;
let mockSections: unknown[] | undefined;
let mockExportPending = false;
const mockExportMutate = vi.fn();
const mockStatusMutate = vi.fn();

vi.mock("@/hooks/useCourses", () => ({
  useCourseQuery: () => ({ data: mockCourse, isLoading: false }),
  useUpdateCourseStatusMutation: () => ({
    mutate: mockStatusMutate,
    isPending: false,
  }),
  useExportCourse: () => ({
    mutate: mockExportMutate,
    isPending: mockExportPending,
  }),
}));

vi.mock("@/hooks/useSections", () => ({
  useSectionsQuery: () => ({ data: mockSections, isLoading: false }),
  useCreateSectionMutation: () => ({ mutate: vi.fn() }),
  useUpdateSectionMutation: () => ({ mutate: vi.fn() }),
  useDeleteSectionMutation: () => ({ mutate: vi.fn() }),
  useReorderSectionsMutation: () => ({ mutate: vi.fn() }),
  useDuplicateSectionMutation: () => ({ mutate: vi.fn() }),
  useCreateLessonMutation: () => ({ mutate: vi.fn() }),
  useUpdateLessonMutation: () => ({ mutate: vi.fn() }),
  useDeleteLessonMutation: () => ({ mutate: vi.fn() }),
  useReorderLessonsMutation: () => ({ mutate: vi.fn() }),
  useDuplicateLessonMutation: () => ({ mutate: vi.fn() }),
  useAddReferenceLinkMutation: () => ({ mutate: vi.fn() }),
  useDeleteReferenceLinkMutation: () => ({ mutate: vi.fn() }),
}));

import CourseBuilderPage from "@/pages/CourseBuilderPage";

describe("CourseBuilderPage — Export button", () => {
  beforeEach(() => {
    mockExportMutate.mockClear();
    mockExportPending = false;
    mockCourse = {
      id: "course-1",
      title: "Test Course",
      status: "draft",
      section_count: 2,
      lesson_count: 5,
      has_issues: false,
      tags: [],
    };
    mockSections = [];
  });

  it("renders Export button in action bar", () => {
    render(
      <MemoryRouter>
        <CourseBuilderPage />
      </MemoryRouter>,
    );
    expect(screen.getByText("Export")).toBeInTheDocument();
  });

  it("calls exportCourse.mutate with courseId on click", () => {
    render(
      <MemoryRouter>
        <CourseBuilderPage />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText("Export"));
    expect(mockExportMutate).toHaveBeenCalledWith("course-1");
  });
});
