/**
 * React Query hooks for LiVi chat thread CRUD.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────

export interface ChatThread {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_preview: string | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

interface ThreadListResponse {
  items: ChatThread[];
}

interface ThreadDetailResponse {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: ChatMessage[];
}

// ── Keys ──────────────────────────────────────────────────────

const THREADS_KEY = ["chat-threads"] as const;
const threadMessagesKey = (id: string) => ["chat-messages", id] as const;

// ── Queries ───────────────────────────────────────────────────

export function useChatThreadsQuery() {
  return useQuery({
    queryKey: THREADS_KEY,
    queryFn: () => api.get<ThreadListResponse>("/chat/threads"),
  });
}

export function useChatMessagesQuery(threadId: string | null) {
  return useQuery({
    queryKey: threadMessagesKey(threadId!),
    queryFn: () => api.get<ThreadDetailResponse>(`/chat/threads/${threadId}`),
    enabled: !!threadId,
  });
}

// ── Mutations ─────────────────────────────────────────────────

export function useCreateThreadMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (title?: string) =>
      api.post<ChatThread>("/chat/threads", { title: title ?? "New Chat" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: THREADS_KEY });
    },
  });
}

export function useRenameThreadMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      api.put<ChatThread>(`/chat/threads/${id}`, { title }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: THREADS_KEY });
    },
  });
}

export function useDeleteThreadMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/chat/threads/${id}`),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: THREADS_KEY });
      const prev = qc.getQueryData<ThreadListResponse>(THREADS_KEY);
      qc.setQueryData<ThreadListResponse>(THREADS_KEY, (old) =>
        old ? { items: old.items.filter((t) => t.id !== id) } : old,
      );
      return { prev };
    },
    onError: (_err, _id, context) => {
      if (context?.prev) qc.setQueryData(THREADS_KEY, context.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: THREADS_KEY });
    },
  });
}

/**
 * Invalidate thread-related caches (call after streaming completes).
 */
export function useChatInvalidation() {
  const qc = useQueryClient();
  return {
    invalidateThreads: () => qc.invalidateQueries({ queryKey: THREADS_KEY }),
    invalidateMessages: (id: string) => qc.invalidateQueries({ queryKey: threadMessagesKey(id) }),
  };
}
