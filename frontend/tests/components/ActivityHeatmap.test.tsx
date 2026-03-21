import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ActivityHeatmap } from "@/components/stats/ActivityHeatmap";

describe("ActivityHeatmap", () => {
  it("renders with title and lesson count", () => {
    render(<ActivityHeatmap days={[]} totalLessons={0} />);
    expect(screen.getByText("Activity")).toBeInTheDocument();
    expect(
      screen.getByText(/0 lessons/),
    ).toBeInTheDocument();
  });

  it("renders legend labels", () => {
    render(<ActivityHeatmap days={[]} totalLessons={0} />);
    expect(screen.getByText("Less")).toBeInTheDocument();
    expect(screen.getByText("More")).toBeInTheDocument();
  });

  it("renders with activity data", () => {
    const days = [
      { date: "2026-03-10", count: 2 },
      { date: "2026-03-11", count: 5 },
    ];
    render(<ActivityHeatmap days={days} totalLessons={7} />);
    expect(
      screen.getByText(/7 lessons/),
    ).toBeInTheDocument();
  });

  it("renders SVG heatmap element", () => {
    const { container } = render(
      <ActivityHeatmap days={[]} totalLessons={0} />,
    );
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("role", "img");
  });

  it("renders heatmap cells as rect elements", () => {
    const days = [{ date: new Date().toISOString().slice(0, 10), count: 3 }];
    const { container } = render(
      <ActivityHeatmap days={days} totalLessons={3} />,
    );
    const rects = container.querySelectorAll("rect");
    expect(rects.length).toBeGreaterThan(0);
  });
});
