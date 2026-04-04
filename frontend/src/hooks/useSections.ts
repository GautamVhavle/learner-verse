/**
 * React Query hooks for course section CRUD operations.
 *
 * Sections are the top-level organizational units within a course.
 * Each section contains an ordered list of lessons. This module
 * handles fetching, creating, updating, deleting, reordering,
 * and duplicating sections.
 *
 * Lesson, metadata, and reference-link hooks live in their own
 * modules (useLessons, useMetadata, useReferenceLinks) and are
 * re-exported here for backward-compatible imports.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  ReorderItem,
  Section,
  SectionBrief,
  SectionCreate,
  SectionUpdate,
} from "@/types/section";

// Re-export lesson, metadata, and reference-link hooks so existing
// import sites continue to work without changes.
export {
  useCreateLessonMutation,
  useUpdateLessonMutation,
  useDeleteLessonMutation,
  useReorderLessonsMutation,
  useDuplicateLessonMutation,
  useMoveLessonMutation,
  useImportPlaylistMutation,
} from "./useLessons";

export {
  useFetchYouTubeMetadata,
  useFetchOpenGraph,
} from "./useMetadata";

export {
  useAddReferenceLinkMutation,
  useDeleteReferenceLinkMutation,
} from "./useReferenceLinks";

// ── Query Keys ──────────────────────────────────────────────
const sectionKeys = {
  all: (courseId: string) => ["sections", courseId] as const,
};

// ── Sections ────────────────────────────────────────────────
export function useSectionsQuery(courseId: string | undefined) {
  return useQuery({
    queryKey: sectionKeys.all(courseId!),
    queryFn: () => api.get<Section[]>(`/courses/${courseId}/sections`),
    enabled: !!courseId,
  });
}

export function useCreateSectionMutation(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SectionCreate) =>
      api.post<Section>(`/courses/${courseId}/sections`, data),
    onSuccess: (newSection) => {
      // Optimistic: append the new section to the cached list instantly
      qc.setQueryData<Section[]>(sectionKeys.all(courseId), (old) =>
        old ? [...old, newSection] : [newSection]
      );
      // Background refetch for consistency
      qc.invalidateQueries({ queryKey: sectionKeys.all(courseId) });
    },
  });
}

export function useUpdateSectionMutation(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SectionUpdate }) =>
      api.put<Section>(`/courses/${courseId}/sections/${id}`, data),
    onSuccess: (updated) => {
      qc.setQueryData<Section[]>(sectionKeys.all(courseId), (old) =>
        old ? old.map((s) => (s.id === updated.id ? updated : s)) : old
      );
      qc.invalidateQueries({ queryKey: sectionKeys.all(courseId) });
    },
  });
}

export function useDeleteSectionMutation(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<void>(`/courses/${courseId}/sections/${id}`),
    onSuccess: (_data, deletedId) => {
      // Optimistic: remove the section from the cached list instantly
      qc.setQueryData<Section[]>(sectionKeys.all(courseId), (old) =>
        old ? old.filter((s) => s.id !== deletedId) : old
      );
      qc.invalidateQueries({ queryKey: sectionKeys.all(courseId) });
    },
  });
}

export function useReorderSectionsMutation(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: ReorderItem[]) =>
      api.put<SectionBrief[]>(`/courses/${courseId}/sections`, { items }),
    onSuccess: () => qc.invalidateQueries({ queryKey: sectionKeys.all(courseId) }),
  });
}

export function useDuplicateSectionMutation(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sectionId: string) =>
      api.post<Section>(`/courses/${courseId}/sections/${sectionId}/duplicate`),
    onSuccess: (newSection) => {
      qc.setQueryData<Section[]>(sectionKeys.all(courseId), (old) =>
        old ? [...old, newSection] : [newSection]
      );
      qc.invalidateQueries({ queryKey: sectionKeys.all(courseId) });
    },
  });
}

export function useOrganizeSectionsMutation(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post<Section[]>(`/courses/${courseId}/sections/organize`),
    onSuccess: (sections) => {
      qc.setQueryData<Section[]>(sectionKeys.all(courseId), sections);
      qc.invalidateQueries({ queryKey: sectionKeys.all(courseId) });
    },
  });
}
