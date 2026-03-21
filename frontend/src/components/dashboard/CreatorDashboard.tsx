/**
 * Creator-mode dashboard with course management grid and import/create actions.
 */
import { useRef, useState } from "react";
import { useModeAwareNavigate } from "@/hooks/useModeAwareNavigate";
import { BookOpen, Plus, Upload, Loader2 } from "lucide-react";
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
  useImportCourseMutation,
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
  const importMutation = useImportCourseMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);

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

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            My Courses
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Build and manage your learning content.
          </p>
        </div>
        {!isEmpty && (
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setImportError(null);
                importMutation.mutate(file, {
                  onError: (err) =>
                    setImportError(
                      err instanceof Error ? err.message : "Import failed",
                    ),
                });
                e.target.value = "";
              }}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={importMutation.isPending}
            >
              {importMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              Import
            </Button>
            <Button onClick={handleCreate}>
              <Plus className="size-4" />
              New Course
            </Button>
          </div>
        )}
      </div>

      {/* Import feedback */}
      {importError && (
        <div className="mb-4 rounded-lg border border-accent-red/30 bg-accent-red/10 px-4 py-2.5 text-sm text-accent-red">
          Import failed: {importError}
        </div>
      )}
      {importMutation.isSuccess && (
        <div className="mb-4 rounded-lg border border-accent-green/30 bg-accent-green/10 px-4 py-2.5 text-sm text-accent-green">
          Course imported successfully!
        </div>
      )}

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
