/**
 * Trash page for viewing, restoring, and permanently deleting soft-deleted courses.
 */
import { RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { CourseStatusBadge } from "@/components/course/CourseStatusBadge";
import {
  useTrashQuery,
  useRestoreCourseMutation,
  usePermanentDeleteMutation,
} from "@/hooks/useCourses";

export default function TrashPage() {
  const { data, isLoading } = useTrashQuery();
  const restoreMutation = useRestoreCourseMutation();
  const permanentDeleteMutation = usePermanentDeleteMutation();

  const courses = data?.items ?? [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-lg bg-bg-tertiary"
          />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          Trash
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Deleted courses can be restored or permanently removed.
        </p>
      </div>

      {courses.length === 0 ? (
        <EmptyState
          icon={<Trash2 className="size-10" />}
          title="Trash is empty"
          description="Deleted courses will appear here."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {courses.map((course) => (
            <div
              key={course.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-border-default bg-bg-secondary p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-text-primary">
                    {course.title}
                  </span>
                  <CourseStatusBadge status={course.status} />
                </div>
                {course.deleted_at && (
                  <p className="mt-0.5 text-xs text-text-tertiary">
                    Deleted{" "}
                    {new Date(course.deleted_at).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => restoreMutation.mutate(course.id)}
                  disabled={restoreMutation.isPending}
                >
                  <RotateCcw className="size-3.5" />
                  Restore
                </Button>
                <ConfirmDialog
                  trigger={
                    <Button variant="destructive" size="sm">
                      <Trash2 className="size-3.5" />
                      Delete Forever
                    </Button>
                  }
                  title="Permanently delete?"
                  description={`"${course.title}" will be gone forever. This cannot be undone.`}
                  confirmLabel="Delete Forever"
                  onConfirm={() => permanentDeleteMutation.mutate(course.id)}
                  isPending={permanentDeleteMutation.isPending}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
