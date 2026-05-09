/**
 * Creator-mode dashboard with course management grid and create actions.
 */
import { useState } from "react";
import { useModeAwareNavigate } from "@/hooks/useModeAwareNavigate";
import { BookOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CourseGrid } from "@/components/course/CourseGrid";
import { CourseForm } from "@/components/course/CourseForm";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  useCoursesQuery,
  useCreateCourseMutation,
  useUpdateCourseMutation,
  useDeleteCourseMutation,
  useDuplicateCourseMutation,
} from "@/hooks/useCourses";
import type { Course, CourseCreate, CourseUpdate } from "@/types/course";

export function CreatorDashboard() {
  const navigate = useModeAwareNavigate();
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const { data, isLoading } = useCoursesQuery({
    status: statusFilter ?? undefined,
    search: search || undefined,
  });
  const createMutation = useCreateCourseMutation();
  const updateMutation = useUpdateCourseMutation();
  const deleteMutation = useDeleteCourseMutation();
  const duplicateMutation = useDuplicateCourseMutation();

  const courses = data?.items ?? [];

  const handleCreate = () => {
    setEditingCourse(null);
    setFormOpen(true);
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    setFormOpen(true);
  };

  const handleFormSubmit = (formData: CourseCreate | CourseUpdate) => {
    if (editingCourse) {
      updateMutation.mutate(
        { id: editingCourse.id, data: formData },
        { onSuccess: () => setFormOpen(false) },
      );
    } else {
      createMutation.mutate(formData as CourseCreate, {
        onSuccess: () => setFormOpen(false),
      });
    }
  };

  const handleDuplicate = (id: string) => {
    setDuplicatingId(id);
    duplicateMutation.mutate(id, {
      onSuccess: (newCourse) => {
        setDuplicatingId(null);
        navigate(`/courses/${newCourse.id}/edit`);
      },
      onError: () => setDuplicatingId(null),
    });
  };

  const isEmpty = !isLoading && courses.length === 0 && !statusFilter && !search;

  const handleTogglePublic = (id: string, isPublic: boolean) => {
    updateMutation.mutate({ id, data: { is_public: isPublic } });
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-text-primary text-2xl font-bold tracking-tight">My Courses</h1>
          <p className="text-text-secondary mt-1 text-sm">
            Build and manage your learning content.
          </p>
        </div>
        {!isEmpty && (
          <Button onClick={handleCreate}>
            <Plus className="size-4" />
            New Course
          </Button>
        )}
      </div>

      {/* Content */}
      {isEmpty ? (
        <EmptyState
          icon={<BookOpen className="size-10" />}
          title="No courses yet"
          description="Create your first course to start building your learning library."
          actionLabel="Create Course"
          onAction={handleCreate}
        />
      ) : (
        <CourseGrid
          courses={courses}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={(id) => deleteMutation.mutate(id)}
          onDuplicate={handleDuplicate}
          onTogglePublic={handleTogglePublic}
          duplicatingId={duplicatingId}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          search={search}
          onSearchChange={setSearch}
        />
      )}

      {/* Form dialog */}
      <CourseForm
        open={formOpen}
        onOpenChange={setFormOpen}
        course={editingCourse}
        onSubmit={handleFormSubmit}
        isPending={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
