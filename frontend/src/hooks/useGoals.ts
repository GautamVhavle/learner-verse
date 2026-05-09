/**
 * React Query hooks for managing course completion goals and deadlines.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { CourseGoalResponse } from "@/types/progress";

const GOALS_KEY = ["goals"] as const;

export function useGoalsQuery() {
  return useQuery({
    queryKey: GOALS_KEY,
    queryFn: () => api.get<CourseGoalResponse[]>("/goals"),
  });
}

export function useSetGoalMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ courseId, goalDate }: { courseId: string; goalDate: string | null }) =>
      api.put<CourseGoalResponse>(`/goals/courses/${courseId}`, {
        goal_date: goalDate,
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: GOALS_KEY });
      qc.invalidateQueries({ queryKey: ["progress"] });
      qc.invalidateQueries({ queryKey: ["courses"] });
      toast.success(
        variables.goalDate ? "Goal set!" : "Goal removed",
        variables.goalDate ? { description: `Target date: ${variables.goalDate}` } : undefined,
      );
    },
    onError: () => toast.error("Failed to update goal"),
  });
}
