/**
 * Course builder page - the creator's editing workspace.
 *
 * Provides a section/lesson tree editor with drag-and-drop reordering,
 * inline title editing, a detail panel for lesson content, course
 * status management. All mutation logic lives in the
 * `useCourseBuilder` hook; this component handles layout and routing.
 */
import { useState, useRef } from "react";
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
  Download,
  Upload,
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
import {
  useUpdateCourseMutation,
  useValidateCourseQuery,
  useExportCourseMutation,
  useImportCourseMutation,
} from "@/hooks/useCourses";
import { useOrganizeSectionsMutation, useResumeOrganizePolling } from "@/hooks/useSections";
import { useProGate } from "@/hooks/useProGate";
import type { ValidationError } from "@/types/course";

export default function CourseBuilderPage() {
  const { id: courseId } = useParams<{ id: string }>();
  const navigate = useModeAwareNavigate();
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showValidation, setShowValidation] = useState(false);
  const { gatedAction, ProGate } = useProGate();
  const [showPrivateWarning, setShowPrivateWarning] = useState(false);
  const updateCourse = useUpdateCourseMutation();
  const validateQuery = useValidateCourseQuery(courseId);
  const organizeMutation = useOrganizeSectionsMutation(courseId!);
  const [isResuming, setIsResuming] = useState(false);
  const exportMutation = useExportCourseMutation();
  const importMutation = useImportCourseMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPayload, setImportPayload] = useState<Record<string, unknown> | null>(null);
  const [importSummary, setImportSummary] = useState<string>("");
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [importValidating, setImportValidating] = useState(false);

  // Resume polling if a previous organize task was interrupted by a refresh
  useResumeOrganizePolling(courseId!, {
    onStart: () => setIsResuming(true),
    onSuccess: () => {
      setIsResuming(false);
      toast.success("Course organized by LiVi!");
    },
    onError: (msg) => {
      setIsResuming(false);
      toast.error(msg || "Failed to organize. Please try again.");
    },
  });

  const handleShowIssues = async () => {
    const { data } = await validateQuery.refetch();
    if (data && data.length > 0) {
      setValidationErrors(data);
      setShowValidation(true);
    }
  };

  const handleExport = () => {
    exportMutation.mutate(courseId!, {
      onSuccess: (data) => {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const title = (data as { course?: { title?: string } }).course?.title ?? "course";
        const safe = title.replace(/[^a-zA-Z0-9 _-]/g, "").replace(/\s+/g, "_") || "course";
        a.href = url;
        a.download = `${safe}_export.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Course exported!");
      },
      onError: () => toast.error("Failed to export course"),
    });
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset so the same file can be re-selected
    e.target.value = "";

    setImportValidating(true);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (parsed.format !== "learnerverse-course-export" || parsed.version !== 1) {
          toast.error("Invalid file: not a LearnerVerse course export.");
          setImportValidating(false);
          return;
        }
        const courseTitle = parsed.course?.title ?? "Unknown";
        const sectionCount = parsed.sections?.length ?? 0;
        const lessonCount =
          parsed.sections?.reduce(
            (sum: number, s: { lessons?: unknown[] }) => sum + (s.lessons?.length ?? 0),
            0,
          ) ?? 0;
        setImportPayload(parsed);
        setImportSummary(
          `"${courseTitle}" - ${sectionCount} section${sectionCount !== 1 ? "s" : ""}, ${lessonCount} lesson${lessonCount !== 1 ? "s" : ""}`,
        );
        setImportValidating(false);
        setShowImportConfirm(true);
      } catch {
        toast.error("Invalid JSON file.");
        setImportValidating(false);
      }
    };
    reader.onerror = () => {
      toast.error("Failed to read file.");
      setImportValidating(false);
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (!importPayload) return;
    setShowImportConfirm(false);
    importMutation.mutate(
      { courseId: courseId!, payload: importPayload },
      {
        onSettled: () => setImportPayload(null),
      },
    );
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
        <Loader2 className="text-text-tertiary size-6 animate-spin" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-text-secondary text-sm">Course not found.</p>
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
          onAddReferenceLink={(data) => handleAddReferenceLink(selectedLesson.id, data)}
          onDeleteReferenceLink={(linkId) => handleDeleteReferenceLink(selectedLesson.id, linkId)}
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
        <div className="border-accent-green/30 bg-accent-green/5 mb-4 flex items-center justify-between rounded-lg border px-4 py-3">
          <div className="flex items-center gap-2">
            <Lock className="text-accent-green size-4" />
            <span className="text-text-primary text-sm font-medium">
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
              <h1 className="text-text-primary truncate text-xl font-semibold">{course.title}</h1>
              <CourseStatusBadge status={course.status} />
            </div>
            <p className="text-text-secondary mt-0.5 text-xs">
              {sections?.length ?? 0} sections &middot; {totalLessons} lessons
              {course.has_issues && (
                <button
                  onClick={handleShowIssues}
                  className="text-accent-amber ml-2 inline-flex cursor-pointer items-center gap-1 hover:underline"
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

          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exportMutation.isPending}
            className="gap-1.5"
          >
            {exportMutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
            Export
          </Button>

          {!isReady && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImportFile}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={importMutation.isPending || importValidating}
                className="gap-1.5"
              >
                {importMutation.isPending || importValidating ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Upload className="size-3.5" />
                )}
                {importValidating ? "Validating…" : "Import"}
              </Button>
            </>
          )}

          <ProGate />
          {!isReady && totalLessons >= 2 && (
            <Button
              variant="outline"
              size="sm"
              onClick={gatedAction(() =>
                organizeMutation.mutate(undefined, {
                  onSuccess: () => toast.success("Course organized by LiVi!"),
                  onError: () => toast.error("Failed to organize. Please try again."),
                }),
              )}
              disabled={organizeMutation.isPending || isResuming}
              className="border-accent-purple/30 text-accent-purple hover:bg-accent-purple/10 gap-1.5"
            >
              {organizeMutation.isPending || isResuming ? (
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
              className="bg-accent-green/15 text-accent-green hover:bg-accent-green/25 gap-1.5"
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
                course.is_public ? "bg-accent-blue/15 text-accent-blue hover:bg-accent-blue/25" : ""
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
        {(organizeMutation.isPending || isResuming) && (
          <div className="bg-bg-primary/80 absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="bg-accent-purple/10 flex size-12 items-center justify-center rounded-full">
                <Sparkles className="text-accent-purple size-6 animate-pulse" />
              </div>
              <p className="text-text-primary text-sm font-medium">
                LiVi is organizing your course…
              </p>
              <p className="text-text-tertiary text-xs">Analyzing lessons and creating sections</p>
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
              This course is currently public. Making it private will remove it from the Course Hub
              and new learners won't be able to discover or enroll in it. Existing enrollments,
              ratings, and reviews will be hidden while the course remains private.
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

      {/* Import confirmation dialog */}
      <AlertDialog
        open={showImportConfirm}
        onOpenChange={(open) => {
          if (!open) setImportPayload(null);
          setShowImportConfirm(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import course?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace all existing content in this course with the imported data. The
              course will be reset to draft status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="bg-bg-secondary rounded-md px-3 py-2 text-sm font-medium">
            {importSummary}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmImport}>
              Yes, replace everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
