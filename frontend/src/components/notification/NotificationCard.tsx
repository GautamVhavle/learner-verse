/**
 * Single notification card with mark-read and delete actions.
 */
import { AlertTriangle, Bell, Check, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NotificationResponse } from "@/types/notification";

const ICON_MAP: Record<string, typeof Bell> = {
  pace_warning: AlertTriangle,
};

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface NotificationCardProps {
  notification: NotificationResponse;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}

export function NotificationCard({
  notification,
  onMarkRead,
  onDelete,
}: NotificationCardProps) {
  const Icon = ICON_MAP[notification.type] ?? Bell;
  const isUnread = !notification.is_read;

  return (
    <div
      data-testid="notification-card"
      className={`group flex gap-3 rounded-lg border p-4 transition-colors ${
        isUnread
          ? "border-accent-purple/30 bg-accent-purple/5"
          : "border-border-default bg-bg-secondary"
      }`}
    >
      {/* Icon */}
      <div
        className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${
          notification.type === "pace_warning"
            ? "bg-amber-500/10 text-amber-400"
            : "bg-accent-purple/10 text-accent-purple"
        }`}
      >
        <Icon className="size-4" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3
            className={`text-sm font-medium ${
              isUnread ? "text-text-primary" : "text-text-secondary"
            }`}
          >
            {notification.title}
          </h3>
          <div className="flex items-center gap-1 text-text-tertiary">
            <Clock className="size-3" />
            <span className="whitespace-nowrap text-xs">
              {formatTimeAgo(notification.created_at)}
            </span>
          </div>
        </div>
        <p className="mt-0.5 text-sm text-text-secondary">
          {notification.message}
        </p>

        {/* Actions */}
        <div className="mt-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {isUnread && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => onMarkRead(notification.id)}
            >
              <Check className="mr-1 size-3" />
              Mark read
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-red-400 hover:text-red-300"
            onClick={() => onDelete(notification.id)}
          >
            <Trash2 className="mr-1 size-3" />
            Delete
          </Button>
        </div>
      </div>

      {/* Unread dot */}
      {isUnread && (
        <div className="mt-2 size-2 shrink-0 rounded-full bg-accent-purple" />
      )}
    </div>
  );
}
