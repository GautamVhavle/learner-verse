import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router";

let mockImportPending = false;
let mockImportSuccess = false;
const mockImportMutate = vi.fn();
const mockCreateMutate = vi.fn();

vi.mock("@/hooks/useCourses", () => ({
  useCoursesQuery: () => ({
    data: { items: [{ id: "c1", title: "Existing", status: "draft", tags: [] }] },
    isLoading: false,
  }),
  useCreateCourseMutation: () => ({
    mutate: mockCreateMutate,
    isPending: false,
  }),
  useUpdateCourseMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteCourseMutation: () => ({ mutate: vi.fn() }),
  useDuplicateCourseMutation: () => ({ mutate: vi.fn() }),
  useImportCourseMutation: () => ({
    mutate: mockImportMutate,
    isPending: mockImportPending,
    isSuccess: mockImportSuccess,
  }),
  useUploadThumbnailMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
  }),
}));

import { CreatorDashboard } from "@/components/dashboard/CreatorDashboard";

describe("CreatorDashboard — Import button", () => {
  beforeEach(() => {
    mockImportMutate.mockClear();
    mockCreateMutate.mockClear();
    mockImportPending = false;
    mockImportSuccess = false;
  });

  it("renders Import button", () => {
    render(<MemoryRouter><CreatorDashboard /></MemoryRouter>);
    expect(screen.getByText("Import")).toBeInTheDocument();
  });

  it("has a hidden file input that accepts .json", () => {
    render(<MemoryRouter><CreatorDashboard /></MemoryRouter>);
    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    expect(fileInput).toBeTruthy();
    expect(fileInput.accept).toBe(".json");
    expect(fileInput.className).toContain("hidden");
  });

  it("calls importMutation.mutate when file is selected", () => {
    render(<MemoryRouter><CreatorDashboard /></MemoryRouter>);
    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = new File(
      [JSON.stringify({ export_version: 1, title: "Imported" })],
      "course.json",
      { type: "application/json" },
    );
    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(mockImportMutate).toHaveBeenCalledWith(file, expect.any(Object));
  });

  it("shows success message after import", () => {
    mockImportSuccess = true;
    render(<MemoryRouter><CreatorDashboard /></MemoryRouter>);
    expect(screen.getByText("Course imported successfully!")).toBeInTheDocument();
  });
});
