/**
 * React Query hooks for the superadmin dashboard API.
 *
 * All hooks hit /api/v1/superadmin/* which is protected server-side.
 * The client-side isSuperadmin() check is a UX guard only — the server
 * enforces the real authorization boundary.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";

// ── Type definitions (mirroring backend schemas/superadmin.py) ───────────────

export interface TrendPoint {
  date: string;
  count: number;
}

export interface TrendResponse {
  points: TrendPoint[];
}

export interface PlatformOverview {
  total_users: number;
  new_users_today: number;
  new_users_this_week: number;
  new_users_this_month: number;
  active_users_today: number;
  active_users_this_week: number;
  active_users_this_month: number;
  total_pro_users: number;
  total_verified_creators: number;
  total_courses: number;
  draft_courses: number;
  published_courses: number;
  public_courses: number;
  total_sections: number;
  total_lessons: number;
  video_lessons: number;
  note_lessons: number;
  quiz_lessons: number;
  total_enrollments: number;
  enrollments_today: number;
  total_lessons_completed: number;
  lessons_completed_today: number;
  total_certificates_issued: number;
  certificates_today: number;
  total_ratings: number;
  average_platform_rating: number;
  total_quiz_attempts: number;
  pending_verification_requests: number;
}

export interface LessonTypeDistribution {
  video: number;
  note: number;
  quiz: number;
}

export interface CourseStatusDistribution {
  draft: number;
  ready: number;
  public: number;
}

export interface TopCourse {
  course_id: string;
  title: string;
  creator_name: string;
  enrollment_count: number;
  completion_rate: number;
  average_rating: number;
}

export interface TopCreator {
  user_id: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  is_verified_creator: boolean;
  total_courses: number;
  total_enrollments: number;
}

export interface AdminUserSummary {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  is_pro: boolean;
  is_verified_creator: boolean;
  courses_created: number;
  courses_enrolled: number;
  lessons_completed: number;
  certificates_earned: number;
  last_active: string | null;
  joined_at: string;
}

export interface PaginatedUserList {
  items: AdminUserSummary[];
  total: number;
  page: number;
  per_page: number;
}

export interface VerificationRequestSummary {
  id: string;
  user_id: string;
  user_email: string;
  user_display_name: string;
  user_avatar_url: string | null;
  user_is_verified_creator: boolean;
  message: string;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export interface PaginatedVerificationList {
  items: VerificationRequestSummary[];
  total: number;
  page: number;
  per_page: number;
}

// ── Overview ─────────────────────────────────────────────────────────────────

export function usePlatformOverview() {
  return useQuery({
    queryKey: ["superadmin", "overview"],
    queryFn: () => api.get<PlatformOverview>("/superadmin/overview"),
    staleTime: 60_000,
  });
}

// ── Trends ────────────────────────────────────────────────────────────────────

export function useUserGrowthTrend(days = 30) {
  return useQuery({
    queryKey: ["superadmin", "trends", "users", days],
    queryFn: () => api.get<TrendResponse>(`/superadmin/trends/users?days=${days}`),
    staleTime: 60_000,
  });
}

export function useActivityTrend(days = 30) {
  return useQuery({
    queryKey: ["superadmin", "trends", "activity", days],
    queryFn: () => api.get<TrendResponse>(`/superadmin/trends/activity?days=${days}`),
    staleTime: 60_000,
  });
}

export function useEnrollmentTrend(days = 30) {
  return useQuery({
    queryKey: ["superadmin", "trends", "enrollments", days],
    queryFn: () => api.get<TrendResponse>(`/superadmin/trends/enrollments?days=${days}`),
    staleTime: 60_000,
  });
}

export function useCourseCreationTrend(days = 30) {
  return useQuery({
    queryKey: ["superadmin", "trends", "courses", days],
    queryFn: () => api.get<TrendResponse>(`/superadmin/trends/courses?days=${days}`),
    staleTime: 60_000,
  });
}

// ── Distributions ─────────────────────────────────────────────────────────────

export function useLessonTypeDistribution() {
  return useQuery({
    queryKey: ["superadmin", "distributions", "lessons"],
    queryFn: () => api.get<LessonTypeDistribution>("/superadmin/distributions/lessons"),
    staleTime: 5 * 60_000,
  });
}

export function useCourseStatusDistribution() {
  return useQuery({
    queryKey: ["superadmin", "distributions", "courses"],
    queryFn: () => api.get<CourseStatusDistribution>("/superadmin/distributions/courses"),
    staleTime: 5 * 60_000,
  });
}

// ── Top lists ────────────────────────────────────────────────────────────────

export function useTopCourses(limit = 10) {
  return useQuery({
    queryKey: ["superadmin", "top-courses", limit],
    queryFn: () => api.get<TopCourse[]>(`/superadmin/top-courses?limit=${limit}`),
    staleTime: 5 * 60_000,
  });
}

export function useTopCreators(limit = 10) {
  return useQuery({
    queryKey: ["superadmin", "top-creators", limit],
    queryFn: () => api.get<TopCreator[]>(`/superadmin/top-creators?limit=${limit}`),
    staleTime: 5 * 60_000,
  });
}

// ── User management ───────────────────────────────────────────────────────────

export function useAdminUserList(page: number, perPage: number, search: string) {
  return useQuery({
    queryKey: ["superadmin", "users", page, perPage, search],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
      });
      if (search) params.set("search", search);
      return api.get<PaginatedUserList>(`/superadmin/users?${params}`);
    },
    staleTime: 30_000,
  });
}

// ── Verification requests ─────────────────────────────────────────────────────

export function useAdminVerificationList(status: string | null, page: number, perPage: number) {
  return useQuery({
    queryKey: ["superadmin", "verifications", status, page, perPage],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
      });
      if (status) params.set("status", status);
      return api.get<PaginatedVerificationList>(`/superadmin/verifications?${params}`);
    },
    staleTime: 30_000,
  });
}

export function useReviewVerificationMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      action,
      note,
    }: {
      requestId: string;
      action: "approve" | "reject";
      note?: string;
    }) =>
      api.put<VerificationRequestSummary>(`/superadmin/verifications/${requestId}`, {
        action,
        note,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["superadmin", "verifications"] });
      qc.invalidateQueries({ queryKey: ["superadmin", "overview"] });
      toast.success("Verification request reviewed.");
    },
    onError: () => toast.error("Failed to review request"),
  });
}

export function useRevokeVerificationMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, note }: { userId: string; note?: string }) =>
      api.post<{ detail: string }>(`/superadmin/verifications/revoke/${userId}`, {
        action: "reject",
        note,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["superadmin", "verifications"] });
      qc.invalidateQueries({ queryKey: ["superadmin", "overview"] });
      toast.success("Verification revoked.");
    },
    onError: () => toast.error("Failed to revoke verification"),
  });
}
