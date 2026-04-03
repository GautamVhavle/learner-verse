/**
 * React Query hooks for fetching and updating the current user profile.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
    onError: () => toast.error("Failed to save profile"),
  });
}

export function useUploadAvatarMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => api.upload<{ url: string }>("/uploads/avatar", file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USER_KEY });
      toast.success("Profile picture updated!");
    },
    onError: () => toast.error("Failed to upload profile picture"),
  });
}

export function useUploadCoverMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => api.upload<{ url: string }>("/uploads/cover", file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USER_KEY });
      toast.success("Cover image updated!");
    },
    onError: () => toast.error("Failed to upload cover image"),
  });
}
