/**
 * React Query hooks for creator analytics — overview, per-course,
 * ratings detail, learners, and top courses.
 */
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  AnalyticsOverview,
  CourseAnalyticsList,
  CourseLearnersList,
  CourseRatingsDetail,
  TopCourse,
} from "@/types/analytics";

// ── Overview ────────────────────────────────────────────────

export function useAnalyticsOverviewQuery(trendDays = 30) {
  return useQuery<AnalyticsOverview>({
    queryKey: ["analytics-overview", trendDays],
    queryFn: () => api.get(`/analytics/overview?trend_days=${trendDays}`),
  });
}

// ── Per-Course List ─────────────────────────────────────────

interface CourseAnalyticsParams {
  sort?: "enrollments" | "completions" | "rating" | "newest" | "title";
  page?: number;
  per_page?: number;
}

export function useCourseAnalyticsQuery(params: CourseAnalyticsParams = {}) {
  const qs = new URLSearchParams();
  if (params.sort) qs.set("sort", params.sort);
  if (params.page) qs.set("page", String(params.page));
  if (params.per_page) qs.set("per_page", String(params.per_page));
  const query = qs.toString();

  return useQuery<CourseAnalyticsList>({
    queryKey: ["analytics-courses", params],
    queryFn: () => api.get(`/analytics/courses${query ? `?${query}` : ""}`),
  });
}

// ── Course Ratings Detail ───────────────────────────────────

export function useCourseRatingsDetailQuery(courseId: string) {
  return useQuery<CourseRatingsDetail>({
    queryKey: ["analytics-ratings", courseId],
    queryFn: () => api.get(`/analytics/courses/${courseId}/ratings`),
    enabled: !!courseId,
  });
}

// ── Course Learners ─────────────────────────────────────────

export function useCourselearnersQuery(courseId: string, page = 1) {
  return useQuery<CourseLearnersList>({
    queryKey: ["analytics-learners", courseId, page],
    queryFn: () => api.get(`/analytics/courses/${courseId}/learners?page=${page}&per_page=50`),
    enabled: !!courseId,
  });
}

/** @alias useCourselearnersQuery — camelCase alias for consistent naming. */
export const useCourseLearnerQuery = useCourselearnersQuery;

// ── Top Courses ─────────────────────────────────────────────

export function useTopCoursesQuery(limit = 5) {
  return useQuery<TopCourse[]>({
    queryKey: ["analytics-top-courses", limit],
    queryFn: () => api.get(`/analytics/top-courses?limit=${limit}`),
  });
}
