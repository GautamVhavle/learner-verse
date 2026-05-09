/**
 * React Query hooks for in-app notifications (list, badge count, mutations).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { NotificationResponse, UnreadCountResponse } from "@/types/notification";

const NOTIF_KEY = ["notifications"] as const;
const UNREAD_KEY = ["notifications", "unread-count"] as const;

export function useNotificationsQuery() {
  return useQuery({
    queryKey: [...NOTIF_KEY],
    queryFn: () => api.get<NotificationResponse[]>("/notifications"),
  });
}

export function useUnreadCountQuery() {
  return useQuery({
    queryKey: [...UNREAD_KEY],
    queryFn: () => api.get<UnreadCountResponse>("/notifications/unread-count"),
    refetchInterval: 60_000,
  });
}

export function useEvaluateNotificationsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<NotificationResponse[]>("/notifications/evaluate"),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [...NOTIF_KEY] });
      qc.invalidateQueries({ queryKey: [...UNREAD_KEY] });
      if (data && data.length > 0) {
        for (const n of data) {
          toast(n.title, { description: n.message });
        }
      }
    },
  });
}

export function useMarkReadMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.put<NotificationResponse>(`/notifications/${id}/read`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...NOTIF_KEY] });
      qc.invalidateQueries({ queryKey: [...UNREAD_KEY] });
    },
  });
}

export function useMarkAllReadMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.put<{ updated: number }>("/notifications/read-all", {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...NOTIF_KEY] });
      qc.invalidateQueries({ queryKey: [...UNREAD_KEY] });
      toast.success("All notifications marked as read");
    },
  });
}

export function useDeleteNotificationMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/notifications/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...NOTIF_KEY] });
      qc.invalidateQueries({ queryKey: [...UNREAD_KEY] });
    },
  });
}
