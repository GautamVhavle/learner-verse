/**
 * React Query hooks for fetching and updating the current user profile.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { UserProfile, UserSettings } from "@/types/user";

const USER_KEY = ["user", "me"] as const;

export function useUserQuery() {
  return useQuery({
    queryKey: USER_KEY,
    queryFn: () => api.get<UserProfile>("/auth/me"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateUserMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<UserSettings>) =>
      api.put<UserProfile>("/auth/me", data),
    onSuccess: (updated) => {
      qc.setQueryData(USER_KEY, updated);
    },
  });
}
