/**
 * Hooks for the creator verification request flow (user-facing).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";

export interface VerificationStatus {
  has_pending: boolean;
  has_approved: boolean;
  status: "pending" | "approved" | "rejected" | null;
  message: string | null;
  admin_note: string | null;
}

export function useVerificationStatus() {
  return useQuery({
    queryKey: ["verification", "status"],
    queryFn: () => api.get<VerificationStatus>("/verification/status"),
    staleTime: 60_000,
  });
}

export function useSubmitVerificationMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (message: string) =>
      api.post<{ detail: string }>("/verification/request", { message }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["verification"] });
      toast.success("Verification request submitted! We'll review it soon.");
    },
    onError: (err: Error) => {
      const msg = err.message.includes("409")
        ? "You already have a pending request."
        : "Failed to submit request.";
      toast.error(msg);
    },
  });
}
