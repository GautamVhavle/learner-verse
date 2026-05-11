/**
 * React Query mutations for lesson reference link management.
 *
 * Handles adding and removing reference links (external URLs with
 * OpenGraph metadata) attached to individual lessons.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ReferenceLink, ReferenceLinkCreate } from "@/types/section";

/** Shared query key factory - must match useSections.ts */
const sectionKeys = {
  all: (courseId: string) => ["sections", courseId] as const,
};

export function useAddReferenceLinkMutation(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      sectionId,
      lessonId,
      data,
    }: {
      sectionId: string;
      lessonId: string;
      data: ReferenceLinkCreate;
    }) => api.post<ReferenceLink>(`/sections/${sectionId}/lessons/${lessonId}/references`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: sectionKeys.all(courseId) }),
  });
}

export function useDeleteReferenceLinkMutation(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      sectionId,
      lessonId,
      linkId,
    }: {
      sectionId: string;
      lessonId: string;
      linkId: string;
    }) => api.delete<void>(`/sections/${sectionId}/lessons/${lessonId}/references/${linkId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: sectionKeys.all(courseId) }),
  });
}
