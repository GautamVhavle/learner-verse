import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, it, expect, vi } from "vitest";
import { CourseCard } from "@/components/course/CourseCard";
import type { Course } from "@/types/course";

const mockCourse: Course = {
  id: "1",
  user_id: "u1",
  title: "Test Course",
  description: "A test description",
  thumbnail_url: null,
  status: "draft",
  is_deleted: false,
  deleted_at: null,
  goal_date: null,
  section_count: 3,
  lesson_count: 8,
  has_issues: false,
  tags: [
    { id: "t1", name: "python" },
    { id: "t2", name: "ai" },
  ],
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

function renderCard(props = {}) {
  return render(
    <MemoryRouter>
      <CourseCard
        course={mockCourse}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onDuplicate={vi.fn()}
        {...props}
      />
    </MemoryRouter>,
  );
}

describe("CourseCard", () => {
  it("renders course title", () => {
    renderCard();
    expect(screen.getByText("Test Course")).toBeInTheDocument();
  });

  it("renders description", () => {
    renderCard();
    expect(screen.getByText("A test description")).toBeInTheDocument();
  });

  it("renders tags", () => {
    renderCard();
    expect(screen.getByText("python")).toBeInTheDocument();
    expect(screen.getByText("ai")).toBeInTheDocument();
  });

  it("renders draft status badge", () => {
    renderCard();
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("renders ready status badge", () => {
    renderCard({ course: { ...mockCourse, status: "ready" } });
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });

  it("shows initials when no thumbnail", () => {
    renderCard();
    expect(screen.getByText("T")).toBeInTheDocument();
  });

  it("renders section and lesson stats", () => {
    renderCard();
    expect(screen.getByText(/3 sections/)).toBeInTheDocument();
    expect(screen.getByText(/8 lessons/)).toBeInTheDocument();
  });

  it("renders singular stats correctly", () => {
    renderCard({ course: { ...mockCourse, section_count: 1, lesson_count: 1 } });
    expect(screen.getByText(/1 section/)).toBeInTheDocument();
    expect(screen.getByText(/1 lesson/)).toBeInTheDocument();
  });

  it("shows confirm dialog when Duplicate is clicked in dropdown", async () => {
    renderCard();
    // Open dropdown
    fireEvent.click(screen.getByRole("button", { name: "" }));
    // Click Duplicate in menu
    const duplicateItem = await screen.findByText("Duplicate");
    fireEvent.click(duplicateItem);
    // Confirm dialog should be visible
    expect(screen.getByText("Duplicate Course")).toBeInTheDocument();
    expect(screen.getByText(/full copy/)).toBeInTheDocument();
  });

  it("calls onDuplicate when confirm dialog action is clicked", async () => {
    const onDuplicate = vi.fn();
    renderCard({ onDuplicate });
    // Open dropdown
    fireEvent.click(screen.getByRole("button", { name: "" }));
    const duplicateItem = await screen.findByText("Duplicate");
    fireEvent.click(duplicateItem);
    // Click the confirm "Duplicate" action button
    const confirmBtns = screen.getAllByText("Duplicate");
    const confirmBtn = confirmBtns[confirmBtns.length - 1];
    fireEvent.click(confirmBtn);
    expect(onDuplicate).toHaveBeenCalledWith("1");
  });
});
