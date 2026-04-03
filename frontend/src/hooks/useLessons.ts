/**
 * React Query mutations for lesson CRUD operations.
 *
 * Handles creating, updating, deleting, reordering, duplicating,
 * and moving lessons within course sections. All mutations
 * optimistically update the sections cache and background-refetch.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  Lesson,
  LessonCreate,
  LessonMove,
  LessonUpdate,
  ReorderItem,
  Section,
} from "@/types/section";

/** Shared query key factory — must match useSections.ts */
const sectionKeys = {
  all: (courseId: string) => ["sections", courseId] as const,
};

export function useCreateLessonMutation(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sectionId, data }: { sectionId: string; data: LessonCreate }) =>
      api.post<Lesson>(`/sections/${sectionId}/lessons`, data),
    onSuccess: (newLesson, { sectionId }) => {
      qc.setQueryData<Section[]>(sectionKeys.all(courseId), (old) =>
        old?.map((s) =>
          s.id === sectionId ? { ...s, lessons: [...s.lessons, newLesson] } : s
        )
      );
      qc.invalidateQueries({ queryKey: sectionKeys.all(courseId) });
    },
  });
}

export function useUpdateLessonMutation(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sectionId, lessonId, data }: { sectionId: string; lessonId: string; data: LessonUpdate }) =>
      api.put<Lesson>(`/sections/${sectionId}/lessons/${lessonId}`, data),
    onSuccess: (updated, { sectionId }) => {
      qc.setQueryData<Section[]>(sectionKeys.all(courseId), (old) =>
        old?.map((s) =>
          s.id === sectionId
            ? { ...s, lessons: s.lessons.map((l) => (l.id === updated.id ? updated : l)) }
            : s
        )
      );
      qc.invalidateQueries({ queryKey: sectionKeys.all(courseId) });
    },
  });
}

export function useDeleteLessonMutation(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sectionId, lessonId }: { sectionId: string; lessonId: string }) =>
      api.delete<void>(`/sections/${sectionId}/lessons/${lessonId}`),
    onSuccess: (_data, { sectionId, lessonId }) => {
      qc.setQueryData<Section[]>(sectionKeys.all(courseId), (old) =>
        old?.map((s) =>
          s.id === sectionId
            ? { ...s, lessons: s.lessons.filter((l) => l.id !== lessonId) }
            : s
        )
      );
      qc.invalidateQueries({ queryKey: sectionKeys.all(courseId) });
    },
  });
}

export function useReorderLessonsMutation(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sectionId, items }: { sectionId: string; items: ReorderItem[] }) =>
      api.put<Lesson[]>(`/sections/${sectionId}/lessons`, { items }),
    onSuccess: () => qc.invalidateQueries({ queryKey: sectionKeys.all(courseId) }),
  });
}

export function useDuplicateLessonMutation(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sectionId, lessonId }: { sectionId: string; lessonId: string }) =>
      api.post<Lesson>(`/sections/${sectionId}/lessons/${lessonId}/duplicate`),
    onSuccess: (newLesson, { sectionId }) => {
      qc.setQueryData<Section[]>(sectionKeys.all(courseId), (old) =>
        old?.map((s) =>
          s.id === sectionId ? { ...s, lessons: [...s.lessons, newLesson] } : s
        )
      );
      qc.invalidateQueries({ queryKey: sectionKeys.all(courseId) });
    },
  });
}

export function useMoveLessonMutation(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sectionId, lessonId, data }: { sectionId: string; lessonId: string; data: LessonMove }) =>
      api.post<Lesson>(`/sections/${sectionId}/lessons/${lessonId}/move`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: sectionKeys.all(courseId) }),
  });
}

interface PlaylistImportResponse {
  playlist_title: string;
  imported_count: number;
  lessons: Lesson[];
}

export function useImportPlaylistMutation(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sectionId, playlistUrl }: { sectionId: string; playlistUrl: string }) =>
      api.post<PlaylistImportResponse>(
        `/sections/${sectionId}/lessons/import-playlist`,
        { playlist_url: playlistUrl }
      ),
    onSuccess: (result, { sectionId }) => {
      qc.setQueryData<Section[]>(sectionKeys.all(courseId), (old) =>
        old?.map((s) =>
          s.id === sectionId
            ? { ...s, lessons: [...s.lessons, ...result.lessons] }
            : s
        )
      );
      qc.invalidateQueries({ queryKey: sectionKeys.all(courseId) });
    },
  });
}
