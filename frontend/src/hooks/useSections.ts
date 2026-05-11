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
import { useEffect, useRef } from "react";
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

export { useFetchYouTubeMetadata, useFetchOpenGraph } from "./useMetadata";

export { useAddReferenceLinkMutation, useDeleteReferenceLinkMutation } from "./useReferenceLinks";

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
    mutationFn: (data: SectionCreate) => api.post<Section>(`/courses/${courseId}/sections`, data),
    onSuccess: (newSection) => {
      // Optimistic: append the new section to the cached list instantly
      qc.setQueryData<Section[]>(sectionKeys.all(courseId), (old) =>
        old ? [...old, newSection] : [newSection],
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
        old ? old.map((s) => (s.id === updated.id ? updated : s)) : old,
      );
      qc.invalidateQueries({ queryKey: sectionKeys.all(courseId) });
    },
  });
}

export function useDeleteSectionMutation(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/courses/${courseId}/sections/${id}`),
    onSuccess: (_data, deletedId) => {
      // Optimistic: remove the section from the cached list instantly
      qc.setQueryData<Section[]>(sectionKeys.all(courseId), (old) =>
        old ? old.filter((s) => s.id !== deletedId) : old,
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
        old ? [...old, newSection] : [newSection],
      );
      qc.invalidateQueries({ queryKey: sectionKeys.all(courseId) });
    },
  });
}

// ── Organize with background polling ─────────────────────────

const ORGANIZE_TASK_PREFIX = "organize_task_";

function getStorageKey(courseId: string) {
  return `${ORGANIZE_TASK_PREFIX}${courseId}`;
}

interface OrganizeStartResponse {
  task_id: string;
}

interface OrganizeStatusResponse {
  status: "pending" | "done" | "failed";
  error: string | null;
}

/**
 * Poll the organize task until it completes or fails.
 * Resolves when done, rejects on failure.
 */
async function pollOrganizeTask(
  courseId: string,
  taskId: string,
  intervalMs = 4000,
  maxAttempts = 120,
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, intervalMs));
    try {
      const res = await api.get<OrganizeStatusResponse>(
        `/courses/${courseId}/sections/organize/${taskId}`,
      );
      if (res.status === "done") {
        localStorage.removeItem(getStorageKey(courseId));
        return;
      }
      if (res.status === "failed") {
        localStorage.removeItem(getStorageKey(courseId));
        throw new Error(res.error ?? "Organization failed");
      }
      // still pending - keep polling
    } catch (err: unknown) {
      // 404 = task not found (may not have propagated to DB yet, or expired)
      // Keep polling for a grace period, then give up
      if (err instanceof Error && "status" in err && (err as { status: number }).status === 404) {
        if (i > 10) {
          localStorage.removeItem(getStorageKey(courseId));
          throw new Error("Task expired. Please try again.");
        }
        // else keep polling - task row may not have committed yet
        continue;
      }
      throw err;
    }
  }
  localStorage.removeItem(getStorageKey(courseId));
  throw new Error("Organization timed out");
}

/**
 * Hook that starts an organize task and polls for completion.
 * Persists the task_id in localStorage so polling resumes on refresh.
 */
export function useOrganizeSectionsMutation(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      // Start the background task
      const { task_id } = await api.post<OrganizeStartResponse>(
        `/courses/${courseId}/sections/organize`,
      );
      // Persist so we can resume on refresh
      localStorage.setItem(getStorageKey(courseId), task_id);
      // Poll until done
      await pollOrganizeTask(courseId, task_id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sectionKeys.all(courseId) });
    },
  });
}

/**
 * Hook that checks localStorage for a pending organize task
 * and resumes polling if found. Call this on page mount.
 */
export function useResumeOrganizePolling(
  courseId: string,
  callbacks: {
    onStart: () => void;
    onSuccess: () => void;
    onError: (msg: string) => void;
  },
) {
  const qc = useQueryClient();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const taskId = localStorage.getItem(getStorageKey(courseId));
    if (!taskId) return;

    callbacks.onStart();
    pollOrganizeTask(courseId, taskId)
      .then(() => {
        qc.invalidateQueries({ queryKey: sectionKeys.all(courseId) });
        callbacks.onSuccess();
      })
      .catch((err: Error) => {
        callbacks.onError(err.message);
      });
  }, [courseId]); // eslint-disable-line react-hooks/exhaustive-deps
}
