import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  DiscussionPage,
  DiscussionMessage,
  DiscussionMessageCreate,
} from "@/types/discussion";

const KEY = "discussion";

export function useDiscussionMessages(courseId: string, before?: string) {
  return useQuery<DiscussionPage>({
    queryKey: [KEY, courseId, before ?? "latest"],
    queryFn: () => {
      const params = new URLSearchParams();
      if (before) params.set("before", before);
      params.set("limit", "50");
      const qs = params.toString();
      return api.get<DiscussionPage>(`/discussions/${courseId}?${qs}`);
    },
    enabled: !!courseId,
    // Only poll the "latest" query, not paginated cursor queries
    refetchInterval: before ? false : 5000,
  });
}

export function useSendDiscussionMessage(courseId: string) {
  const qc = useQueryClient();
  return useMutation<DiscussionMessage, Error, DiscussionMessageCreate>({
    mutationFn: (payload) => api.post<DiscussionMessage>(`/discussions/${courseId}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY, courseId] });
    },
  });
}
