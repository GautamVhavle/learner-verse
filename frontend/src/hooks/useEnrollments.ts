/**
 * React Query hooks for course enrollment.
 *
 * useEnrolledCoursesQuery — fetch the courses the user has enrolled in.
 * useEnrollMutation       — enroll in a course by ID.
 * useUnenrollMutation     — unenroll from a course by ID.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CourseListResponse } from "@/types/course";
import type { EnrollmentResponse } from "@/types/enrollment";

export const ENROLLMENTS_KEY = ["enrollments"] as const;

/** Fetch all courses the current user is enrolled in. */
export function useEnrolledCoursesQuery() {
  return useQuery({
    queryKey: ENROLLMENTS_KEY,
    queryFn: () => api.get<CourseListResponse>("/enrollments"),
  });
}

/** Enroll in a course by ID. Invalidates the enrollments list on success. */
export function useEnrollMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (courseId: string) =>
      api.post<EnrollmentResponse>(`/enrollments/${courseId}`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ENROLLMENTS_KEY }),
  });
}

/** Unenroll from a course by ID. Invalidates the enrollments list on success. */
export function useUnenrollMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (courseId: string) =>
      api.delete<void>(`/enrollments/${courseId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ENROLLMENTS_KEY }),
  });
}
