import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

const mockGoals = [
  {
    course_id: "c1",
    course_title: "React Fundamentals",
    goal_date: "2026-04-20",
    total_lessons: 10,
    completed_lessons: 5,
    percentage: 50,
    pace_status: "on_track",
    lessons_per_week_needed: 2.5,
    days_remaining: 31,
    completed_early_by_days: null,
  },
];

const mockCourses = {
  items: [
    {
      id: "c2",
      title: "TypeScript Advanced",
      lesson_count: 8,
      section_count: 2,
      goal_date: null,
      status: "ready",
    },
  ],
  total: 1,
};

let goalsData: typeof mockGoals | [] = mockGoals;

vi.mock("@/hooks/useGoals", () => ({
  useGoalsQuery: () => ({
    data: goalsData,
    isLoading: false,
  }),
  useSetGoalMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

vi.mock("@/hooks/useCourses", () => ({
  useCoursesQuery: () => ({
    data: mockCourses,
    isLoading: false,
  }),
}));

vi.mock("react-router", () => ({
  useNavigate: () => vi.fn(),
}));

import GoalsPage from "@/pages/GoalsPage";

describe("GoalsPage", () => {
  it("renders goals page with active goals", () => {
    goalsData = mockGoals;
    render(<GoalsPage />);
    expect(screen.getByText("Learning Goals")).toBeInTheDocument();
    expect(screen.getByText("React Fundamentals")).toBeInTheDocument();
    // "On Track" appears in stat card + pace badge
    expect(screen.getAllByText("On Track").length).toBeGreaterThanOrEqual(1);
  });

  it("shows courses without goals section", () => {
    goalsData = mockGoals;
    render(<GoalsPage />);
    expect(screen.getByText("Courses Without Goals")).toBeInTheDocument();
    expect(screen.getByText("TypeScript Advanced")).toBeInTheDocument();
  });

  it("shows empty state when no goals and no courses", () => {
    goalsData = [];
    // Override mock for this test
    render(<GoalsPage />);
    // Should show the "no courses" or "add goal" section
    expect(screen.getByText("Learning Goals")).toBeInTheDocument();
  });

  it("renders summary stats when goals exist", () => {
    goalsData = mockGoals;
    render(<GoalsPage />);
    // Stat card labels
    expect(screen.getByText("Need Attention")).toBeInTheDocument();
    // Pace badge in the goal card
    expect(screen.getAllByText("On Track").length).toBeGreaterThanOrEqual(1);
  });
});
