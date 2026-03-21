import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

const mockOnOpenChange = vi.fn();
const mockOnViewCertificate = vi.fn();

// Mock canvas-confetti
vi.mock("canvas-confetti", () => ({
  default: vi.fn(),
}));

import { CelebrationModal } from "@/components/certificate/CelebrationModal";

describe("CelebrationModal", () => {
  it("renders congratulations message when open", () => {
    render(
      <CelebrationModal
        open={true}
        onOpenChange={mockOnOpenChange}
        courseTitle="React Basics"
        onViewCertificate={mockOnViewCertificate}
      />,
    );
    expect(screen.getByText("Congratulations!")).toBeInTheDocument();
    expect(screen.getByText("React Basics")).toBeInTheDocument();
    expect(screen.getByText("View Certificate")).toBeInTheDocument();
  });

  it("calls onViewCertificate when button clicked", () => {
    render(
      <CelebrationModal
        open={true}
        onOpenChange={mockOnOpenChange}
        courseTitle="React Basics"
        onViewCertificate={mockOnViewCertificate}
      />,
    );
    fireEvent.click(screen.getByText("View Certificate"));
    expect(mockOnViewCertificate).toHaveBeenCalled();
  });

  it("calls onOpenChange when close button clicked", () => {
    render(
      <CelebrationModal
        open={true}
        onOpenChange={mockOnOpenChange}
        courseTitle="React Basics"
        onViewCertificate={mockOnViewCertificate}
      />,
    );
    fireEvent.click(screen.getByText("Close"));
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
});
