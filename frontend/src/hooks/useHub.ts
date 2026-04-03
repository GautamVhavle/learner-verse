/**
 * React Query hooks for the Course Hub — public course discovery,
 * private (my) courses, and ratings.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { CourseListResponse, Course } from "@/types/course";
import type { Section } from "@/types/section";
import type { RatingCreate, RatingListResponse, Rating, RatingUpdate } from "@/types/rating";

// ── Hub Course Queries ────────────────────────────────────────

interface HubParams {
  search?: string;
  tags?: string;
  sort?: "newest" | "oldest" | "title";
  page?: number;
  per_page?: number;
}

export function useHubCoursesQuery(params: HubParams = {}) {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.tags) qs.set("tags", params.tags);
  if (params.sort) qs.set("sort", params.sort);
  if (params.page) qs.set("page", String(params.page));
  if (params.per_page) qs.set("per_page", String(params.per_page));
  const query = qs.toString();

  return useQuery<CourseListResponse>({
    queryKey: ["hub-courses", params],
    queryFn: () => api.get(`/hub/courses${query ? `?${query}` : ""}`),
  });
}

export function useMyCoursesQuery(params: HubParams = {}) {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.sort) qs.set("sort", params.sort);
  if (params.page) qs.set("page", String(params.page));
  if (params.per_page) qs.set("per_page", String(params.per_page));
  const query = qs.toString();

  return useQuery<CourseListResponse>({
    queryKey: ["hub-my-courses", params],
    queryFn: () => api.get(`/hub/my-courses${query ? `?${query}` : ""}`),
  });
}

export function useHubCourseQuery(courseId: string) {
  return useQuery<Course>({
    queryKey: ["hub-course", courseId],
    queryFn: () => api.get(`/hub/courses/${courseId}`),
    enabled: !!courseId,
  });
}

export function useHubSectionsQuery(courseId: string | undefined) {
  return useQuery<Section[]>({
    queryKey: ["hub-sections", courseId],
    queryFn: () => api.get(`/hub/courses/${courseId}/sections`),
    enabled: !!courseId,
  });
}

// ── Rating Queries ────────────────────────────────────────────

export function useRatingsQuery(courseId: string) {
  return useQuery<RatingListResponse>({
    queryKey: ["ratings", courseId],
    queryFn: () => api.get(`/hub/courses/${courseId}/ratings`),
    enabled: !!courseId,
  });
}

// ── Rating Mutations ──────────────────────────────────────────

export function useCreateRatingMutation(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: RatingCreate) =>
      api.post<Rating>(`/hub/courses/${courseId}/ratings`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ratings", courseId] });
      qc.invalidateQueries({ queryKey: ["hub-courses"] });
      qc.invalidateQueries({ queryKey: ["hub-course", courseId] });
      toast.success("Rating submitted");
    },
    onError: () => toast.error("Failed to submit rating"),
  });
}

export function useUpdateRatingMutation(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: RatingUpdate) =>
      api.put<Rating>(`/hub/courses/${courseId}/ratings`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ratings", courseId] });
      qc.invalidateQueries({ queryKey: ["hub-courses"] });
      qc.invalidateQueries({ queryKey: ["hub-course", courseId] });
      toast.success("Rating updated");
    },
    onError: () => toast.error("Failed to update rating"),
  });
}

export function useDeleteRatingMutation(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete(`/hub/courses/${courseId}/ratings`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ratings", courseId] });
      qc.invalidateQueries({ queryKey: ["hub-courses"] });
      qc.invalidateQueries({ queryKey: ["hub-course", courseId] });
      toast.success("Rating deleted");
    },
    onError: () => toast.error("Failed to delete rating"),
  });
}
