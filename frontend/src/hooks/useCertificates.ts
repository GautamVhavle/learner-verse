/**
 * React Query hooks for fetching and generating course certificates.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { CertificateResponse } from "@/types/certificate";

const CERT_KEY = ["certificates"] as const;

export function useCertificatesQuery() {
  return useQuery({
    queryKey: [...CERT_KEY],
    queryFn: () => api.get<CertificateResponse[]>("/certificates"),
  });
}

export function useCertificateQuery(certId: string | undefined) {
  return useQuery({
    queryKey: [...CERT_KEY, certId],
    queryFn: () => api.get<CertificateResponse>(`/certificates/${certId}`),
    enabled: !!certId,
  });
}

export function useCourseCertificateQuery(courseId: string | undefined) {
  return useQuery({
    queryKey: [...CERT_KEY, "course", courseId],
    queryFn: () =>
      api.get<CertificateResponse | null>(
        `/certificates/courses/${courseId}`,
      ),
    enabled: !!courseId,
  });
}

export function useGenerateCertificateMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (courseId: string) =>
      api.post<CertificateResponse>(`/certificates/courses/${courseId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...CERT_KEY] });
      toast.success("Certificate generated!", {
        description: "View it on your certificates page.",
      });
    },
    onError: () => toast.error("Failed to generate certificate"),
  });
}
