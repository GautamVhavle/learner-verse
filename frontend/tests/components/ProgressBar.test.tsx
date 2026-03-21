import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ProgressBar } from "@/components/study/ProgressBar";

describe("ProgressBar", () => {
  it("renders with 0%", () => {
    const { container } = render(<ProgressBar value={0} />);
    const bar = container.querySelector("[style]");
    expect(bar).toHaveStyle({ width: "0%" });
  });

  it("renders with 50%", () => {
    const { container } = render(<ProgressBar value={50} />);
    const bar = container.querySelector("[style]");
    expect(bar).toHaveStyle({ width: "50%" });
  });

  it("clamps value to 100 max", () => {
    const { container } = render(<ProgressBar value={150} />);
    const bar = container.querySelector("[style]");
    expect(bar).toHaveStyle({ width: "100%" });
  });

  it("shows label when showLabel is true", () => {
    render(<ProgressBar value={75} showLabel />);
    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("does not show label by default", () => {
    render(<ProgressBar value={75} />);
    expect(screen.queryByText("75%")).not.toBeInTheDocument();
  });
});
