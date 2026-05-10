/**
 * Hooks for the creator verification request flow (user-facing).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";

export interface VerificationHistoryItem {
  id: string;
  message: string;
  status: "pending" | "approved" | "rejected" | "withdrawn";
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export interface VerificationStatus {
  has_pending: boolean;
  has_approved: boolean;
  status: "pending" | "approved" | "rejected" | "withdrawn" | null;
  message: string | null;
  admin_note: string | null;
  request_id: string | null;
  history: VerificationHistoryItem[];
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

export function useWithdrawVerificationMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete<{ detail: string }>("/verification/request"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["verification"] });
      toast.success("Verification request withdrawn.");
    },
    onError: () => {
      toast.error("Failed to withdraw request.");
    },
  });
}
