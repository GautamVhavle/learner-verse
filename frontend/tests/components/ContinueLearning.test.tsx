import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router";
import { ContinueLearning } from "@/components/dashboard/ContinueLearning";
import type { Course } from "@/types/course";
import type { CourseProgressResponse } from "@/types/progress";
import type { StudyStateResponse } from "@/types/study";

const mockCourse: Course = {
  id: "c1",
  user_id: "u1",
  title: "React Fundamentals",
  description: "Learn React",
  thumbnail_url: null,
  status: "ready",
  is_deleted: false,
  deleted_at: null,
  goal_date: null,
  section_count: 2,
  lesson_count: 5,
  has_issues: false,
  tags: [],
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const mockProgress: CourseProgressResponse = {
  course_id: "c1",
  total_lessons: 5,
  completed_lessons: 2,
  percentage: 40,
  sections: [],
  lesson_progress: {},
};

const mockStudyState: StudyStateResponse = {
  course_id: "c1",
  last_lesson_id: "l3",
  last_accessed_at: "2024-01-15T12:00:00Z",
};

describe("ContinueLearning", () => {
  it("renders course title and progress", () => {
    render(
      <MemoryRouter>
        <ContinueLearning
          course={mockCourse}
          progress={mockProgress}
          studyState={mockStudyState}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText("React Fundamentals")).toBeInTheDocument();
    expect(screen.getByText("Continue Learning")).toBeInTheDocument();
    expect(screen.getByText("Resume")).toBeInTheDocument();
    expect(screen.getByText("2 of 5 lessons completed")).toBeInTheDocument();
    expect(screen.getByText("40%")).toBeInTheDocument();
  });

  it("renders Resume button", () => {
    render(
      <MemoryRouter>
        <ContinueLearning
          course={mockCourse}
          progress={mockProgress}
          studyState={null}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText("Resume")).toBeInTheDocument();
  });
});
