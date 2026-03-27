import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

let mockCount = 3;

vi.mock("@/hooks/useNotifications", () => ({
  useUnreadCountQuery: () => ({
    data: { count: mockCount },
  }),
}));

import { NotificationBadge } from "@/components/notification/NotificationBadge";

describe("NotificationBadge", () => {
  it("shows count when there are unread notifications", () => {
    mockCount = 3;
    render(<NotificationBadge />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("shows 9+ for counts above 9", () => {
    mockCount = 15;
    render(<NotificationBadge />);
    expect(screen.getByText("9+")).toBeInTheDocument();
  });

  it("renders nothing when count is zero", () => {
    mockCount = 0;
    const { container } = render(<NotificationBadge />);
    expect(container.firstChild).toBeNull();
  });
});
