/**
 * Lesson study page — the main reading/viewing experience.
 *
 * Renders a single lesson with its content (video, markdown, links),
 * a sidebar with course navigation, progress tracking, focus mode,
 * keyboard shortcuts, and the course-completion celebration flow.
 */
import { useEffect, useCallback, useState, useMemo } from "react";
import { useParams } from "react-router";
import { ArrowLeft, Loader2, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LessonBreadcrumb } from "@/components/lesson/LessonBreadcrumb";
import { LessonContent } from "@/components/lesson/LessonContent";
import { LessonNavButtons } from "@/components/lesson/LessonNavButtons";
import { StudyNotes } from "@/components/study/StudyNotes";
import { StudySidebar } from "@/components/study/StudySidebar";
import { CompletionButton } from "@/components/study/CompletionButton";
import { useToggleProgressMutation } from "@/hooks/useProgress";
import { ProgressBar } from "@/components/study/ProgressBar";
import { FocusOverlay } from "@/components/study/FocusOverlay";
import { CelebrationModal } from "@/components/certificate/CelebrationModal";
import { KeyboardShortcuts } from "@/components/shared/KeyboardShortcuts";
import { useHubCourseQuery, useHubSectionsQuery } from "@/hooks/useHub";
import { useLessonNavigation } from "@/hooks/useLessonNavigation";
import { useUpdateStudyStateMutation } from "@/hooks/useStudy";
import { useCourseProgressQuery } from "@/hooks/useProgress";
import { useGenerateCertificateMutation } from "@/hooks/useCertificates";
import { useFocusMode } from "@/hooks/useFocusMode";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useModeAwareNavigate } from "@/hooks/useModeAwareNavigate";
import { useUserQuery } from "@/hooks/useUser";

export default function LessonPage() {
  const { courseId, lessonId } = useParams<{
    courseId: string;
    lessonId: string;
  }>();
  const navigate = useModeAwareNavigate();

  const { data: course, isLoading: courseLoading } = useHubCourseQuery(courseId ?? "");
  const { data: sections, isLoading: sectionsLoading } =
    useHubSectionsQuery(courseId);
  const { data: user } = useUserQuery();
  const updateState = useUpdateStudyStateMutation();
  const { data: progress } = useCourseProgressQuery(courseId);
  const generateCert = useGenerateCertificateMutation();
  const toggleProgress = useToggleProgressMutation();
  const [showCelebration, setShowCelebration] = useState(false);

  const isLoading = courseLoading || sectionsLoading;

  const { currentLesson, currentSection, prevLesson, nextLesson } =
    useLessonNavigation(sections, lessonId);

  // Calculate lesson position (X of Y)
  const currentLessonNumber = useMemo(() => {
    if (!currentSection || !currentLesson) return undefined;
    const index = currentSection.lessons.findIndex((l) => l.id === currentLesson.id);
    return index !== -1 ? index + 1 : undefined;
  }, [currentSection, currentLesson]);

  const totalLessonsInSection = useMemo(() => {
    return currentSection?.lessons.length ?? 0;
  }, [currentSection]);

  // Track study state — save the current lesson as last viewed
  useEffect(() => {
    if (courseId && lessonId) {
      updateState.mutate({
        courseId,
        data: { last_lesson_id: lessonId },
      });
    }
  }, [courseId, lessonId]);

  const goToLesson = useCallback(
    (id: string) => navigate(`/study/${courseId}/lessons/${id}`),
    [courseId, navigate]
  );

  const { focusMode, toggleFocusMode, setFocusMode } = useFocusMode();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Exit focus mode when leaving the lesson page
  useEffect(() => {
    return () => setFocusMode(false);
  }, [setFocusMode]);

  // Study-view keyboard shortcuts (F, N/→, P/←)
  const studyShortcuts = useMemo(
    () => [
      { key: "f", action: toggleFocusMode, description: "Toggle focus mode" },
      {
        key: "n",
        action: () => nextLesson && goToLesson(nextLesson.id),
        description: "Next lesson",
      },
      {
        key: "ArrowRight",
        action: () => nextLesson && goToLesson(nextLesson.id),
        description: "Next lesson",
      },
      {
        key: "p",
        action: () => prevLesson && goToLesson(prevLesson.id),
        description: "Previous lesson",
      },
      {
        key: "ArrowLeft",
        action: () => prevLesson && goToLesson(prevLesson.id),
        description: "Previous lesson",
      },
    ],
    [toggleFocusMode, nextLesson, prevLesson, goToLesson],
  );

  useKeyboardShortcuts(studyShortcuts);

  const handleCompletionToggled = useCallback(
    (newCompleted: boolean) => {
      if (!newCompleted || !progress || !courseId || !currentLesson) return;
      // Check if this was the last incomplete lesson
      const wasCompleted = progress.lesson_progress[currentLesson.id] ?? false;
      if (wasCompleted) return; // Was already complete, skip
      const newCompletedCount = progress.completed_lessons + 1;
      if (newCompletedCount >= progress.total_lessons && progress.total_lessons > 0) {
        generateCert.mutate(courseId);
        setShowCelebration(true);
      }
    },
    [progress, courseId, currentLesson, generateCert],
  );

  /** Auto-mark quiz lesson as complete when the learner passes */
  const handleQuizCompleted = useCallback(() => {
    if (!currentLesson) return;
    const alreadyComplete = progress?.lesson_progress?.[currentLesson.id] ?? false;
    if (alreadyComplete) return;
    toggleProgress.mutate(
      { lessonId: currentLesson.id, data: { completed: true } },
      { onSuccess: () => handleCompletionToggled(true) },
    );
  }, [currentLesson, progress, toggleProgress, handleCompletionToggled]);

  /** When a YouTube video finishes: auto-mark complete, then auto-advance */
  const handleVideoEnded = useCallback(() => {
    if (!currentLesson) return;
    const autoPlay = user?.auto_play_next ?? true;
    const alreadyComplete = progress?.lesson_progress?.[currentLesson.id] ?? false;

    const advanceToNext = () => {
      if (autoPlay && nextLesson) {
        goToLesson(nextLesson.id);
      }
    };

    if (!alreadyComplete) {
      toggleProgress.mutate(
        { lessonId: currentLesson.id, data: { completed: true } },
        {
          onSuccess: () => {
            handleCompletionToggled(true);
            advanceToNext();
          },
        },
      );
    } else {
      advanceToNext();
    }
  }, [currentLesson, user, progress, nextLesson, toggleProgress, handleCompletionToggled, goToLesson]);

  /** Mark complete from bottom button */
  const handleMarkCompleteFromBottom = useCallback(() => {
    if (!currentLesson) return;
    const newState = !(progress?.lesson_progress?.[currentLesson.id] ?? false);
    toggleProgress.mutate(
      { lessonId: currentLesson.id, data: { completed: newState } },
      { onSuccess: () => handleCompletionToggled(newState) },
    );
  }, [currentLesson, progress, toggleProgress, handleCompletionToggled]);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-text-tertiary" />
      </div>
    );
  }

  if (!course || !currentLesson) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-sm text-text-secondary">Lesson not found.</p>
        <Button variant="outline" onClick={() => navigate("/")}>
          <ArrowLeft className="size-4" />
          Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      {/* Breadcrumb — hidden in focus mode */}
      {!focusMode && (
        <LessonBreadcrumb
          courseTitle={course.title}
          sectionTitle={currentSection?.title}
          lessonTitle={currentLesson.title}
          onCourseClick={() => navigate(`/study/${courseId}`)}
        />
      )}

      <div className={`flex flex-col gap-6 ${focusMode ? "" : "lg:flex-row"}`}>
        {/* Sidebar — hidden in focus mode */}
        {!focusMode && (
          <aside className="order-2 w-full shrink-0 lg:order-1 lg:w-60">
            <div className="sticky top-4 space-y-3">
              {/* Mini progress */}
              {progress && progress.total_lessons > 0 && (
                <div className="rounded-xl border border-border-default bg-bg-secondary p-3">
                  <ProgressBar
                    value={progress.percentage}
                    size="sm"
                    showLabel
                  />
                </div>
              )}
              <div className="rounded-xl border border-border-default bg-bg-secondary p-2">
                <div className="mb-2 px-2.5 py-1.5">
                <button
                  onClick={() => navigate(`/study/${courseId}`)}
                  className="text-xs font-medium text-text-tertiary transition-colors hover:text-text-secondary"
                >
                  ← Course Overview
                </button>
              </div>
              <StudySidebar
                sections={sections ?? []}
                selectedLessonId={lessonId ?? null}
                onSelectLesson={goToLesson}
                lessonProgress={progress?.lesson_progress}
              />
            </div>
          </div>
        </aside>
        )}

        {/* Main content */}
        <main className={`min-w-0 flex-1 ${focusMode ? "" : "order-1 lg:order-2"}`}>
          <div className="space-y-6">
            {/* Lesson title + Completion + Focus toggle */}
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-xl font-semibold text-text-primary">
                {currentLesson.title}
              </h1>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={toggleFocusMode}
                  title={focusMode ? "Exit focus mode (F)" : "Focus mode (F)"}
                  className="text-text-tertiary hover:text-text-primary"
                >
                  <Maximize2 className="size-4" />
                </Button>
                <CompletionButton
                  lessonId={currentLesson.id}
                  completed={progress?.lesson_progress?.[currentLesson.id] ?? false}
                  onToggled={handleCompletionToggled}
                />
              </div>
            </div>

            {/* Lesson body (video, markdown, links, quiz) */}
            <LessonContent
              lesson={currentLesson}
              onQuizCompleted={handleQuizCompleted}
              onVideoEnded={handleVideoEnded}
              playbackSpeed={user?.playback_speed ?? 1}
            />

            {/* Study Notes */}
            <StudyNotes lessonId={currentLesson.id} />

            {/* Prev / Next navigation — hidden in focus mode (overlay replaces it) */}
            {!focusMode && (
              <LessonNavButtons
                prevLesson={prevLesson}
                nextLesson={nextLesson}
                onNavigate={goToLesson}
                currentLessonNumber={currentLessonNumber}
                totalLessons={totalLessonsInSection}
                isCompleted={progress?.lesson_progress?.[currentLesson.id] ?? false}
                onMarkComplete={handleMarkCompleteFromBottom}
                isLoading={toggleProgress.isPending}
              />
            )}
          </div>

          {/* Extra bottom spacing so overlay doesn't cover content */}
          {focusMode && <div className="h-16" />}
        </main>
      </div>

      {/* Focus mode overlay — floating bottom bar */}
      {focusMode && (
        <FocusOverlay
          onExit={() => setFocusMode(false)}
          onPrev={prevLesson ? () => goToLesson(prevLesson.id) : undefined}
          onNext={nextLesson ? () => goToLesson(nextLesson.id) : undefined}
          onShowShortcuts={() => setShortcutsOpen(true)}
          lessonTitle={currentLesson.title}
        />
      )}

      {/* Celebration modal */}
      <CelebrationModal
        open={showCelebration}
        onOpenChange={setShowCelebration}
        courseTitle={course.title}
        onViewCertificate={() => {
          setShowCelebration(false);
          navigate("/certificates");
        }}
        goalMetEarlyByDays={progress?.goal?.completed_early_by_days}
      />

      {/* Shortcuts modal (opened from FocusOverlay button) */}
      <KeyboardShortcuts open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
}
