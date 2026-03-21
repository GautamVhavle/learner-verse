import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StatsCards } from "@/components/stats/StatsCards";

const stats = {
  total_courses_completed: 2,
  total_lessons_completed: 18,
  current_streak: 5,
  longest_streak: 10,
  most_active_day: "Monday",
  total_active_days: 12,
};

describe("StatsCards", () => {
  it("renders all five stat cards", () => {
    render(<StatsCards stats={stats} />);
    expect(screen.getByText("Current Streak")).toBeInTheDocument();
    expect(screen.getByText("Longest Streak")).toBeInTheDocument();
    expect(screen.getByText("Lessons Completed")).toBeInTheDocument();
    expect(screen.getByText("Courses Completed")).toBeInTheDocument();
    expect(screen.getByText("Active Days")).toBeInTheDocument();
  });

  it("displays correct values", () => {
    render(<StatsCards stats={stats} />);
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("shows most active day subtitle", () => {
    render(<StatsCards stats={stats} />);
    expect(screen.getByText("Most active: Monday")).toBeInTheDocument();
  });

  it("shows 'Start learning' when no most active day", () => {
    render(<StatsCards stats={{ ...stats, most_active_day: null }} />);
    expect(screen.getByText("Start learning")).toBeInTheDocument();
  });

  it("shows 'Keep it going!' for active streak", () => {
    render(<StatsCards stats={stats} />);
    expect(screen.getByText("Keep it going!")).toBeInTheDocument();
  });

  it("shows 'Start today' for zero streak", () => {
    render(<StatsCards stats={{ ...stats, current_streak: 0 }} />);
    expect(screen.getByText("Start today")).toBeInTheDocument();
  });
});
