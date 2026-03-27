import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { NotificationCard } from "@/components/notification/NotificationCard";

const unreadNotification = {
  id: "n1",
  user_id: "u1",
  type: "pace_warning",
  title: "Falling behind on React 101",
  message: "You need to pick up the pace to meet your goal.",
  is_read: false,
  created_at: new Date(Date.now() - 3600_000).toISOString(),
};

const readNotification = {
  id: "n2",
  user_id: "u1",
  type: "pace_warning",
  title: "Overdue: Python Basics",
  message: "Your goal date has passed.",
  is_read: true,
  created_at: new Date(Date.now() - 86400_000).toISOString(),
};

describe("NotificationCard", () => {
  it("renders title and message", () => {
    render(
      <NotificationCard
        notification={unreadNotification}
        onMarkRead={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(
      screen.getByText("Falling behind on React 101"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "You need to pick up the pace to meet your goal.",
      ),
    ).toBeInTheDocument();
  });

  it("shows unread dot for unread notifications", () => {
    const { container } = render(
      <NotificationCard
        notification={unreadNotification}
        onMarkRead={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(
      container.querySelector(".bg-accent-purple.rounded-full.size-2"),
    ).toBeInTheDocument();
  });

  it("does not show unread dot for read notifications", () => {
    const { container } = render(
      <NotificationCard
        notification={readNotification}
        onMarkRead={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(
      container.querySelector(".bg-accent-purple.rounded-full.size-2"),
    ).not.toBeInTheDocument();
  });

  it("shows mark read button for unread notifications", () => {
    render(
      <NotificationCard
        notification={unreadNotification}
        onMarkRead={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("Mark read")).toBeInTheDocument();
  });

  it("does not show mark read button for read notifications", () => {
    render(
      <NotificationCard
        notification={readNotification}
        onMarkRead={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.queryByText("Mark read")).not.toBeInTheDocument();
  });

  it("calls onMarkRead when mark read is clicked", () => {
    const onMarkRead = vi.fn();
    render(
      <NotificationCard
        notification={unreadNotification}
        onMarkRead={onMarkRead}
        onDelete={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("Mark read"));
    expect(onMarkRead).toHaveBeenCalledWith("n1");
  });

  it("calls onDelete when delete is clicked", () => {
    const onDelete = vi.fn();
    render(
      <NotificationCard
        notification={unreadNotification}
        onMarkRead={vi.fn()}
        onDelete={onDelete}
      />,
    );
    fireEvent.click(screen.getByText("Delete"));
    expect(onDelete).toHaveBeenCalledWith("n1");
  });

  it("shows relative time", () => {
    render(
      <NotificationCard
        notification={unreadNotification}
        onMarkRead={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("1h ago")).toBeInTheDocument();
  });
});
