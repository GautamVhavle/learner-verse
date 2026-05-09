/**
 * Inbox page displaying all user notifications with management actions.
 */
import { useEffect } from "react";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationCard } from "@/components/notification/NotificationCard";
import {
  useNotificationsQuery,
  useMarkReadMutation,
  useMarkAllReadMutation,
  useDeleteNotificationMutation,
  useEvaluateNotificationsMutation,
} from "@/hooks/useNotifications";

export default function InboxPage() {
  const { data: notifications, isLoading } = useNotificationsQuery();
  const markRead = useMarkReadMutation();
  const markAllRead = useMarkAllReadMutation();
  const deleteNotification = useDeleteNotificationMutation();
  const evaluate = useEvaluateNotificationsMutation();

  useEffect(() => {
    evaluate.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const items = notifications ?? [];
  const hasUnread = items.some((n) => !n.is_read);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="text-text-tertiary size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-text-primary text-2xl font-bold tracking-tight">Inbox</h1>
          <p className="text-text-secondary mt-1 text-sm">
            Notifications and reminders for your learning goals.
          </p>
        </div>
        {hasUnread && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            <CheckCheck className="mr-1.5 size-4" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Notification list */}
      {items.length === 0 ? (
        <div
          className="border-border-default flex min-h-[40vh] items-center justify-center rounded-xl border border-dashed py-16"
          data-testid="empty-state"
        >
          <div className="flex max-w-sm flex-col items-center text-center">
            <div className="bg-accent-purple/10 mb-4 flex size-14 items-center justify-center rounded-full">
              <Bell className="text-accent-purple/50 size-7" />
            </div>
            <h3 className="text-text-primary text-base font-medium">No notifications</h3>
            <p className="text-text-secondary mt-1 text-sm">
              You're all caught up! Notifications about your learning goals will appear here.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onMarkRead={(id) => markRead.mutate(id)}
              onDelete={(id) => deleteNotification.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
