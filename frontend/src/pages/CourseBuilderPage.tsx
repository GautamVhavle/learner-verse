/**
 * Course builder page — the creator's editing workspace.
 *
 * Provides a section/lesson tree editor with drag-and-drop reordering,
 * inline title editing, a detail panel for lesson content, course
 * status management. All mutation logic lives in the
 * `useCourseBuilder` hook; this component handles layout and routing.
 */
import { useState } from "react";
import { useParams } from "react-router";
import { useModeAwareNavigate } from "@/hooks/useModeAwareNavigate";
import {
  ArrowLeft,
  Loader2,
  Eye,
  CheckCircle2,
  FileEdit,
  AlertTriangle,
  Globe,
  Lock,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SectionList } from "@/components/course/SectionList";
import { LessonDetailPanel } from "@/components/lesson/LessonDetailPanel";
import { CourseStatusBadge } from "@/components/course/CourseStatusBadge";
import { ValidationErrorsDialog } from "@/components/course/ValidationErrorsDialog";
import { useCourseBuilder } from "@/hooks/useCourseBuilder";
import { useUpdateCourseMutation, useValidateCourseQuery } from "@/hooks/useCourses";
import { useOrganizeSectionsMutation } from "@/hooks/useSections";
import type { ValidationError } from "@/types/course";

export default function CourseBuilderPage() {
  const { id: courseId } = useParams<{ id: string }>();
  const navigate = useModeAwareNavigate();
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showValidation, setShowValidation] = useState(false);
  const [showPrivateWarning, setShowPrivateWarning] = useState(false);
  const updateCourse = useUpdateCourseMutation();
  const validateQuery = useValidateCourseQuery(courseId);
  const organizeMutation = useOrganizeSectionsMutation(courseId!);

  const handleShowIssues = async () => {
    const { data } = await validateQuery.refetch();
    if (data && data.length > 0) {
      setValidationErrors(data);
      setShowValidation(true);
    }
  };

  const {
    course,
    sections,
    isLoading,
    totalLessons,
    updateStatus,
    findLesson,
    handleAddSection,
    handleUpdateSection,
    handleDeleteSection,
    handleDuplicateSection,
    handleReorderSections,
    handleAddLesson,
    handleUpdateLesson,
    handleDeleteLesson,
    handleDuplicateLesson,
    handleReorderLessons,
    handleUpdateLessonFull,
    handleAddReferenceLink,
    handleDeleteReferenceLink,
    handleMarkReady,
    handleBackToDraft,
  } = useCourseBuilder(courseId);

  const onMarkReady = () => {
    handleMarkReady((errors) => {
      setValidationErrors(errors);
      setShowValidation(true);
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-text-tertiary" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-sm text-text-secondary">Course not found.</p>
        <Button variant="outline" onClick={() => navigate("/")}>
          <ArrowLeft className="size-4" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  // Find the selected lesson for the detail panel
  const selectedLesson = selectedLessonId ? findLesson(selectedLessonId) : null;

  // If a lesson is selected, show the detail panel (but only in draft mode)
  if (selectedLesson && course.status !== "ready") {
    return (
      <div className="mx-auto max-w-3xl">
        <LessonDetailPanel
          lesson={selectedLesson}
          courseId={courseId!}
          onUpdate={(data) => handleUpdateLessonFull(selectedLesson.id, data)}
          onAddReferenceLink={(data) =>
            handleAddReferenceLink(selectedLesson.id, data)
          }
          onDeleteReferenceLink={(linkId) =>
            handleDeleteReferenceLink(selectedLesson.id, linkId)
          }
          onClose={() => setSelectedLessonId(null)}
        />
      </div>
    );
  }

  const isReady = course.status === "ready";
  const wasPublished = course.enrollment_count > 0 || course.is_public;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Published banner */}
      {isReady && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-accent-green/30 bg-accent-green/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <Lock className="size-4 text-accent-green" />
            <span className="text-sm font-medium text-text-primary">
              This course is published and read-only.
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleBackToDraft}
            disabled={updateStatus.isPending}
            className="gap-1.5"
          >
            <FileEdit className="size-3.5" />
            Edit Course
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="mt-0.5 shrink-0"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <h1 className="truncate text-xl font-semibold text-text-primary">
                {course.title}
              </h1>
              <CourseStatusBadge status={course.status} />
            </div>
            <p className="mt-0.5 text-xs text-text-secondary">
              {sections?.length ?? 0} sections &middot; {totalLessons} lessons
              {course.has_issues && (
                <button
                  onClick={handleShowIssues}
                  className="ml-2 inline-flex cursor-pointer items-center gap-1 text-accent-amber hover:underline"
                >
                  <AlertTriangle className="size-3" />
                  Has issues
                </button>
              )}
            </p>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex flex-wrap items-center gap-2 pl-10">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/courses/${courseId}/preview`)}
            className="gap-1.5"
          >
            <Eye className="size-3.5" />
            Preview
          </Button>

          {!isReady && totalLessons >= 2 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                organizeMutation.mutate(undefined, {
                  onSuccess: () => toast.success("Course organized by LiVi!"),
                  onError: () => toast.error("Failed to organize. Please try again."),
                })
              }
              disabled={organizeMutation.isPending}
              className="gap-1.5 border-accent-purple/30 text-accent-purple hover:bg-accent-purple/10"
            >
              {organizeMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              Organize with LiVi
            </Button>
          )}

          {!isReady && (
            <Button
              size="sm"
              onClick={onMarkReady}
              disabled={updateStatus.isPending}
              className="gap-1.5 bg-accent-green/15 text-accent-green hover:bg-accent-green/25"
            >
              {updateStatus.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : wasPublished ? (
                <RefreshCw className="size-3.5" />
              ) : (
                <CheckCircle2 className="size-3.5" />
              )}
              {wasPublished ? "Republish" : "Publish"}
            </Button>
          )}

          {isReady && (
            <Button
              variant={course.is_public ? "default" : "outline"}
              size="sm"
              onClick={() => {
                if (course.is_public) {
                  setShowPrivateWarning(true);
                } else {
                  updateCourse.mutate({
                    id: courseId!,
                    data: { is_public: true },
                  });
                }
              }}
              disabled={updateCourse.isPending}
              className={`gap-1.5 ${
                course.is_public
                  ? "bg-accent-blue/15 text-accent-blue hover:bg-accent-blue/25"
                  : ""
              }`}
            >
              {updateCourse.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Globe className="size-3.5" />
              )}
              {course.is_public ? "Public" : "Make Public"}
            </Button>
          )}
        </div>
      </div>

      {/* Section List */}
      <div className={`relative ${isReady ? "pointer-events-none opacity-60" : ""}`}>
        {organizeMutation.isPending && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-bg-primary/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-full bg-accent-purple/10">
                <Sparkles className="size-6 animate-pulse text-accent-purple" />
              </div>
              <p className="text-sm font-medium text-text-primary">
                LiVi is organizing your course…
              </p>
              <p className="text-xs text-text-tertiary">
                Analyzing lessons and creating sections
              </p>
            </div>
          </div>
        )}
        <SectionList
          sections={sections ?? []}
          courseId={courseId!}
          onAddSection={handleAddSection}
          onUpdateSection={handleUpdateSection}
          onDeleteSection={handleDeleteSection}
          onDuplicateSection={handleDuplicateSection}
          onReorderSections={handleReorderSections}
        onAddLesson={handleAddLesson}
        onUpdateLesson={handleUpdateLesson}
        onDeleteLesson={handleDeleteLesson}
        onDuplicateLesson={handleDuplicateLesson}
        onReorderLessons={handleReorderLessons}
        onLessonClick={isReady ? undefined : setSelectedLessonId}
        />
      </div>

      {/* Validation errors dialog */}
      <ValidationErrorsDialog
        open={showValidation}
        onOpenChange={setShowValidation}
        errors={validationErrors}
      />

      {/* Public → Private warning dialog */}
      <AlertDialog open={showPrivateWarning} onOpenChange={setShowPrivateWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Make this course private?</AlertDialogTitle>
            <AlertDialogDescription>
              This course is currently public. Making it private will remove it
              from the Course Hub and new learners won't be able to discover or
              enroll in it. Existing enrollments, ratings, and reviews will be
              hidden while the course remains private.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                updateCourse.mutate({
                  id: courseId!,
                  data: { is_public: false },
                })
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Make Private
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
