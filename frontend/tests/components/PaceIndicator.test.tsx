import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PaceIndicator } from "@/components/goals/PaceIndicator";
import type { GoalResponse } from "@/types/progress";

describe("PaceIndicator", () => {
  it("renders on_track status", () => {
    const goal: GoalResponse = {
      goal_date: "2026-04-20",
      pace_status: "on_track",
      lessons_per_week_needed: 2.5,
      days_remaining: 31,
      completed_early_by_days: null,
    };
    render(<PaceIndicator goal={goal} />);
    expect(screen.getByText("On Track")).toBeInTheDocument();
    expect(screen.getByText(/31 days? remaining/)).toBeInTheDocument();
  });

  it("renders ahead status", () => {
    const goal: GoalResponse = {
      goal_date: "2026-05-20",
      pace_status: "ahead",
      lessons_per_week_needed: 0.5,
      days_remaining: 61,
      completed_early_by_days: null,
    };
    render(<PaceIndicator goal={goal} />);
    expect(screen.getByText("Ahead of Schedule!")).toBeInTheDocument();
  });

  it("renders behind status", () => {
    const goal: GoalResponse = {
      goal_date: "2026-03-23",
      pace_status: "behind",
      lessons_per_week_needed: 8.5,
      days_remaining: 3,
      completed_early_by_days: null,
    };
    render(<PaceIndicator goal={goal} />);
    expect(screen.getByText("Behind Schedule")).toBeInTheDocument();
    expect(screen.getByText(/8\.5 lessons\/week/)).toBeInTheDocument();
  });

  it("renders completed status with early days", () => {
    const goal: GoalResponse = {
      goal_date: "2026-04-20",
      pace_status: "completed",
      lessons_per_week_needed: 0,
      days_remaining: 5,
      completed_early_by_days: 5,
    };
    render(<PaceIndicator goal={goal} />);
    expect(screen.getByText("Goal Met!")).toBeInTheDocument();
    expect(screen.getByText("Finished 5 days early!")).toBeInTheDocument();
  });

  it("renders overdue status", () => {
    const goal: GoalResponse = {
      goal_date: "2026-03-15",
      pace_status: "overdue",
      lessons_per_week_needed: 35,
      days_remaining: -5,
      completed_early_by_days: null,
    };
    render(<PaceIndicator goal={goal} />);
    expect(screen.getByText("Overdue")).toBeInTheDocument();
  });

  it("renders compact variant", () => {
    const goal: GoalResponse = {
      goal_date: "2026-04-20",
      pace_status: "on_track",
      lessons_per_week_needed: 2,
      days_remaining: 31,
      completed_early_by_days: null,
    };
    render(<PaceIndicator goal={goal} compact />);
    expect(screen.getByText("On Track")).toBeInTheDocument();
    // Compact doesn't show days remaining
    expect(screen.queryByText(/remaining/)).not.toBeInTheDocument();
  });
});
