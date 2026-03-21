/**
 * React Query hooks for learning statistics, streaks, and activity data.
 */
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  StatsOverviewResponse,
  StreakResponse,
  ActivityResponse,
} from "@/types/stats";

const STATS_KEY = ["stats"] as const;

export function useStatsOverviewQuery() {
  return useQuery({
    queryKey: [...STATS_KEY, "overview"],
    queryFn: () => api.get<StatsOverviewResponse>("/stats/overview"),
  });
}

export function useStreakQuery() {
  return useQuery({
    queryKey: [...STATS_KEY, "streak"],
    queryFn: () => api.get<StreakResponse>("/stats/streak"),
  });
}

export function useActivityQuery(months: number = 12) {
  return useQuery({
    queryKey: [...STATS_KEY, "activity", months],
    queryFn: () =>
      api.get<ActivityResponse>(`/stats/activity?months=${months}`),
  });
}
