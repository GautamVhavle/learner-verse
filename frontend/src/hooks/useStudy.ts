/**
 * React Query hooks for study state persistence and study notes.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  StudyNoteResponse,
  StudyNoteUpdate,
  StudyStateResponse,
  StudyStateUpdate,
} from "@/types/study";

const STUDY_STATE_KEY = ["study-state"] as const;
const STUDY_NOTES_KEY = ["study-notes"] as const;

// ── Study State ─────────────────────────────────────────────

export function useStudyStateQuery(courseId: string | undefined) {
  return useQuery({
    queryKey: [...STUDY_STATE_KEY, courseId],
    queryFn: () =>
      api.get<StudyStateResponse | null>(
        `/study/courses/${courseId}/state`
      ),
    enabled: !!courseId,
  });
}

export function useUpdateStudyStateMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      courseId,
      data,
    }: {
      courseId: string;
      data: StudyStateUpdate;
    }) =>
      api.put<StudyStateResponse>(
        `/study/courses/${courseId}/state`,
        data
      ),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({
        queryKey: [...STUDY_STATE_KEY, variables.courseId],
      });
    },
  });
}

// ── Study Notes ─────────────────────────────────────────────

export function useStudyNoteQuery(lessonId: string | undefined) {
  return useQuery({
    queryKey: [...STUDY_NOTES_KEY, lessonId],
    queryFn: () =>
      api.get<StudyNoteResponse>(`/study/lessons/${lessonId}/notes`),
    enabled: !!lessonId,
  });
}

export function useUpdateStudyNoteMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      lessonId,
      data,
    }: {
      lessonId: string;
      data: StudyNoteUpdate;
    }) =>
      api.put<StudyNoteResponse>(
        `/study/lessons/${lessonId}/notes`,
        data
      ),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({
        queryKey: [...STUDY_NOTES_KEY, variables.lessonId],
      });
    },
  });
}
