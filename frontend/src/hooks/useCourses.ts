/**
 * React Query hooks for course CRUD, status transitions, and trash management.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type {
  Course,
  CourseCreate,
  CourseListResponse,
  CourseUpdate,
  StatusUpdateResponse,
} from "@/types/course";

const COURSES_KEY = ["courses"] as const;
const TRASH_KEY = ["courses", "trash"] as const;

export function useCoursesQuery(params?: {
  status?: string;
  search?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.search) searchParams.set("search", params.search);
  const qs = searchParams.toString();

  return useQuery({
    queryKey: [...COURSES_KEY, params ?? {}],
    queryFn: () => api.get<CourseListResponse>(`/courses${qs ? `?${qs}` : ""}`),
  });
}

export function useCourseQuery(courseId: string | undefined) {
  return useQuery({
    queryKey: [...COURSES_KEY, courseId],
    queryFn: () => api.get<Course>(`/courses/${courseId}`),
    enabled: !!courseId,
  });
}

export function useTrashQuery() {
  return useQuery({
    queryKey: TRASH_KEY,
    queryFn: () => api.get<CourseListResponse>("/courses/trash"),
  });
}

export function useCreateCourseMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CourseCreate) =>
      api.post<Course>("/courses", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: COURSES_KEY });
      toast.success("Course created!");
    },
    onError: () => toast.error("Failed to create course"),
  });
}

export function useUpdateCourseMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CourseUpdate }) =>
      api.put<Course>(`/courses/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: COURSES_KEY }),
  });
}

export function useDeleteCourseMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<Course>(`/courses/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: COURSES_KEY });
      qc.invalidateQueries({ queryKey: TRASH_KEY });
      toast.success("Course moved to trash");
    },
    onError: () => toast.error("Failed to delete course"),
  });
}

export function useRestoreCourseMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Course>(`/courses/${id}/restore`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: COURSES_KEY });
      qc.invalidateQueries({ queryKey: TRASH_KEY });
      toast.success("Course restored!");
    },
    onError: () => toast.error("Failed to restore course"),
  });
}

export function usePermanentDeleteMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/courses/${id}/permanent`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TRASH_KEY });
      toast.success("Course permanently deleted");
    },
    onError: () => toast.error("Failed to delete course"),
  });
}

export function useDuplicateCourseMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Course>(`/courses/${id}/duplicate`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: COURSES_KEY });
      toast.success("Course duplicated!");
    },
    onError: () => toast.error("Failed to duplicate course"),
  });
}

export function useUpdateCourseStatusMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "draft" | "ready" }) =>
      api.put<StatusUpdateResponse>(`/courses/${id}/status`, { status }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: COURSES_KEY });
      toast.success(
        variables.status === "ready" ? "Course published!" : "Course unpublished",
      );
    },
    onError: () => toast.error("Failed to update course status"),
  });
}

export function useUploadThumbnailMutation() {
  return useMutation({
    mutationFn: (file: File) =>
      api.upload<{ url: string }>("/uploads/thumbnail", file),
  });
}
