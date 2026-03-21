/**
 * React Query hooks for tracking and toggling lesson/course progress.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  CourseProgressResponse,
  LessonProgressResponse,
  ProgressToggle,
} from "@/types/progress";

const PROGRESS_KEY = ["progress"] as const;

export function useCourseProgressQuery(courseId: string | undefined) {
  return useQuery({
    queryKey: [...PROGRESS_KEY, "course", courseId],
    queryFn: () =>
      api.get<CourseProgressResponse>(`/progress/courses/${courseId}`),
    enabled: !!courseId,
  });
}

export function useToggleProgressMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      lessonId,
      data,
    }: {
      lessonId: string;
      data: ProgressToggle;
    }) =>
      api.put<LessonProgressResponse>(
        `/progress/lessons/${lessonId}`,
        data,
      ),
    onMutate: async ({ lessonId, data }) => {
      // Optimistic update: update course progress caches
      const queries = qc.getQueriesData<CourseProgressResponse>({
        queryKey: [...PROGRESS_KEY, "course"],
      });

      const previousData: Array<{
        key: readonly unknown[];
        data: CourseProgressResponse | undefined;
      }> = [];

      for (const [key, oldData] of queries) {
        if (!oldData) continue;
        previousData.push({ key, data: oldData });

        const wasCompleted = oldData.lesson_progress[lessonId] ?? false;
        const isNowCompleted = data.completed;
        if (wasCompleted === isNowCompleted) continue;

        const delta = isNowCompleted ? 1 : -1;
        const newCompleted = oldData.completed_lessons + delta;
        const newPercentage =
          oldData.total_lessons > 0
            ? Math.round((newCompleted / oldData.total_lessons) * 1000) / 10
            : 0;

        qc.setQueryData<CourseProgressResponse>(key, {
          ...oldData,
          completed_lessons: newCompleted,
          percentage: newPercentage,
          lesson_progress: {
            ...oldData.lesson_progress,
            [lessonId]: isNowCompleted,
          },
        });
      }

      return { previousData };
    },
    onError: (_err, _vars, context) => {
      // Rollback optimistic updates
      if (context?.previousData) {
        for (const { key, data } of context.previousData) {
          qc.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: [...PROGRESS_KEY, "course"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}
