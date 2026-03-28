/**
 * React Query hook for fetching a public learner profile.
 */
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { PublicProfile } from "@/types/user";

export function usePublicProfileQuery(userId: string) {
  return useQuery({
    queryKey: ["profile", userId],
    queryFn: () => api.get<PublicProfile>(`/profile/${userId}`),
    enabled: !!userId,
    retry: false,
  });
}
