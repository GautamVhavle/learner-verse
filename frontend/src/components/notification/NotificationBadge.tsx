/**
 * Displays an unread notification count badge.
 * Renders nothing when count is zero.
 */
import { useUnreadCountQuery } from "@/hooks/useNotifications";

export function NotificationBadge() {
  const { data } = useUnreadCountQuery();
  const count = data?.count ?? 0;

  if (count === 0) return null;

  return (
    <span className="bg-accent-purple ml-auto flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white">
      {count > 9 ? "9+" : count}
    </span>
  );
}
