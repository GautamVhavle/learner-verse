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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionList } from "@/components/course/SectionList";
import { LessonDetailPanel } from "@/components/lesson/LessonDetailPanel";
import { CourseStatusBadge } from "@/components/course/CourseStatusBadge";
import { ValidationErrorsDialog } from "@/components/course/ValidationErrorsDialog";
import { useCourseBuilder } from "@/hooks/useCourseBuilder";
import { useUpdateCourseMutation } from "@/hooks/useCourses";
import type { ValidationError } from "@/types/course";

export default function CourseBuilderPage() {
  const { id: courseId } = useParams<{ id: string }>();
  const navigate = useModeAwareNavigate();
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showValidation, setShowValidation] = useState(false);
  const updateCourse = useUpdateCourseMutation();

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

  // If a lesson is selected, show the detail panel
  if (selectedLesson) {
    return (
      <div className="mx-auto max-w-3xl">
        <LessonDetailPanel
          lesson={selectedLesson}
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

  return (
    <div className="mx-auto max-w-3xl">
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
                <span className="ml-2 inline-flex items-center gap-1 text-accent-amber">
                  <AlertTriangle className="size-3" />
                  Has issues
                </span>
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

          {isReady ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleBackToDraft}
              disabled={updateStatus.isPending}
              className="gap-1.5"
            >
              <FileEdit className="size-3.5" />
              Back to Draft
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={onMarkReady}
              disabled={updateStatus.isPending}
              className="gap-1.5 bg-accent-green/15 text-accent-green hover:bg-accent-green/25"
            >
              {updateStatus.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="size-3.5" />
              )}
              Mark as Ready
            </Button>
          )}

          {isReady && (
            <Button
              variant={course.is_public ? "default" : "outline"}
              size="sm"
              onClick={() =>
                updateCourse.mutate({
                  id: courseId!,
                  data: { is_public: !course.is_public },
                })
              }
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
      <SectionList
        sections={sections ?? []}
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
        onLessonClick={setSelectedLessonId}
      />

      {/* Validation errors dialog */}
      <ValidationErrorsDialog
        open={showValidation}
        onOpenChange={setShowValidation}
        errors={validationErrors}
      />
    </div>
  );
}
