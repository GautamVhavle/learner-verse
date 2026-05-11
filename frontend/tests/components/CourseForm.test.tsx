import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi } from "vitest";
import { CourseForm } from "@/components/course/CourseForm";
import userEvent from "@testing-library/user-event";

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

function renderWithProviders(ui: React.ReactElement) {
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("CourseForm", () => {
  it("renders create form when no course provided", () => {
    renderWithProviders(
      <CourseForm
        open={true}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByText("New Course")).toBeInTheDocument();
    expect(screen.getByText("Create Course")).toBeInTheDocument();
  });

  it("renders edit form when course is provided", () => {
    renderWithProviders(
      <CourseForm
        open={true}
        onOpenChange={vi.fn()}
        course={{
          id: "1",
          user_id: "u1",
          title: "Existing",
          description: null,
          thumbnail_url: null,
          status: "draft",
          is_deleted: false,
          deleted_at: null,
          goal_date: null,
          section_count: 0,
          lesson_count: 0,
          has_issues: false,
          tags: [],
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        }}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByText("Edit Course")).toBeInTheDocument();
    expect(screen.getByText("Save Changes")).toBeInTheDocument();
  });

  it("calls onSubmit with form data", async () => {
    const onSubmit = vi.fn();
    renderWithProviders(
      <CourseForm
        open={true}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    const titleInput = screen.getByPlaceholderText(
      "e.g. Intro to Machine Learning",
    );
    await userEvent.type(titleInput, "My New Course");

    const submitBtn = screen.getByText("Create Course");
    await userEvent.click(submitBtn);

    expect(onSubmit).toHaveBeenCalledWith({
      title: "My New Course",
      description: null,
      thumbnail_url: null,
      category: "other",
      goal_date: null,
      tags: [],
    });
  });

  it("disables submit when title is empty", () => {
    renderWithProviders(
      <CourseForm
        open={true}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    const submitBtn = screen.getByText("Create Course");
    expect(submitBtn).toBeDisabled();
  });
});
