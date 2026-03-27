import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

const mockNotifications = [
  {
    id: "n1",
    user_id: "u1",
    type: "pace_warning",
    title: "Falling behind on React 101",
    message: "You need to pick up the pace to meet your goal.",
    is_read: false,
    created_at: new Date(Date.now() - 3600_000).toISOString(),
  },
  {
    id: "n2",
    user_id: "u1",
    type: "pace_warning",
    title: "Overdue: Python Basics",
    message: "Your goal date has passed.",
    is_read: true,
    created_at: new Date(Date.now() - 86400_000).toISOString(),
  },
];

let returnData: typeof mockNotifications | [] = mockNotifications;
const mockMarkRead = vi.fn();
const mockMarkAllRead = vi.fn();
const mockDelete = vi.fn();
const mockEvaluate = vi.fn();

vi.mock("@/hooks/useNotifications", () => ({
  useNotificationsQuery: () => ({
    data: returnData,
    isLoading: false,
  }),
  useMarkReadMutation: () => ({
    mutate: mockMarkRead,
    isPending: false,
  }),
  useMarkAllReadMutation: () => ({
    mutate: mockMarkAllRead,
    isPending: false,
  }),
  useDeleteNotificationMutation: () => ({
    mutate: mockDelete,
    isPending: false,
  }),
  useEvaluateNotificationsMutation: () => ({
    mutate: mockEvaluate,
    isPending: false,
  }),
}));

import InboxPage from "@/pages/InboxPage";

describe("InboxPage", () => {
  it("renders notification cards", () => {
    returnData = mockNotifications;
    render(<InboxPage />);
    expect(screen.getByText("Inbox")).toBeInTheDocument();
    expect(
      screen.getByText("Falling behind on React 101"),
    ).toBeInTheDocument();
    expect(screen.getByText("Overdue: Python Basics")).toBeInTheDocument();
  });

  it("shows empty state when no notifications", () => {
    returnData = [];
    render(<InboxPage />);
    expect(screen.getByText("No notifications")).toBeInTheDocument();
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
  });

  it("shows mark all read button when unread exist", () => {
    returnData = mockNotifications;
    render(<InboxPage />);
    expect(screen.getByText("Mark all read")).toBeInTheDocument();
  });

  it("calls markAllRead on button click", () => {
    returnData = mockNotifications;
    render(<InboxPage />);
    fireEvent.click(screen.getByText("Mark all read"));
    expect(mockMarkAllRead).toHaveBeenCalled();
  });

  it("evaluates notifications on mount", () => {
    returnData = [];
    render(<InboxPage />);
    expect(mockEvaluate).toHaveBeenCalled();
  });
});
