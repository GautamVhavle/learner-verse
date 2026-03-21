import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

const mockStats = {
  total_courses_completed: 3,
  total_lessons_completed: 42,
  current_streak: 7,
  longest_streak: 14,
  most_active_day: "Wednesday",
  total_active_days: 25,
};

const mockActivity = {
  days: [
    { date: "2026-03-15", count: 3 },
    { date: "2026-03-16", count: 1 },
  ],
  total_lessons: 4,
};

let statsData: typeof mockStats | undefined = mockStats;
let activityData: typeof mockActivity | undefined = mockActivity;
let statsLoading = false;

vi.mock("@/hooks/useStats", () => ({
  useStatsOverviewQuery: () => ({
    data: statsData,
    isLoading: statsLoading,
  }),
  useActivityQuery: () => ({
    data: activityData,
    isLoading: statsLoading,
  }),
}));

import StatsPage from "@/pages/StatsPage";

describe("StatsPage", () => {
  it("renders stats cards with data", () => {
    statsData = mockStats;
    activityData = mockActivity;
    statsLoading = false;
    render(<StatsPage />);
    expect(screen.getByText("Learning Stats")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument(); // current streak
    expect(screen.getByText("14")).toBeInTheDocument(); // longest streak
    expect(screen.getByText("42")).toBeInTheDocument(); // lessons
    // courses "3" may match other numbers, use getAll
    expect(screen.getByText("25")).toBeInTheDocument(); // active days
  });

  it("shows loading skeleton", () => {
    statsData = undefined;
    activityData = undefined;
    statsLoading = true;
    const { container } = render(<StatsPage />);
    expect(screen.getByText(/Loading your activity/)).toBeInTheDocument();
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(
      0,
    );
  });

  it("shows empty state when no data after loading", () => {
    statsData = undefined;
    activityData = undefined;
    statsLoading = false;
    render(<StatsPage />);
    expect(screen.getByText("No stats yet")).toBeInTheDocument();
  });

  it("renders activity heatmap section", () => {
    statsData = mockStats;
    activityData = mockActivity;
    statsLoading = false;
    render(<StatsPage />);
    expect(screen.getByText("Activity")).toBeInTheDocument();
    expect(
      screen.getByText(/4 lessons/),
    ).toBeInTheDocument();
  });

  it("shows most active day in stats card", () => {
    statsData = mockStats;
    activityData = mockActivity;
    statsLoading = false;
    render(<StatsPage />);
    expect(
      screen.getByText("Most active: Wednesday"),
    ).toBeInTheDocument();
  });
});
