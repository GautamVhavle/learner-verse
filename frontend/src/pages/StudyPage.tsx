/**
 * Study page for a single course.
 *
 * Shows a hero card with progress, a list of section cards, a
 * sidebar lesson tree, and a goal date picker dialog.
 */
import { useState } from "react";
import { useParams } from "react-router";
import { useModeAwareNavigate } from "@/hooks/useModeAwareNavigate";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StudyHero } from "@/components/study/StudyHero";
import { StudySectionList } from "@/components/study/StudySectionList";
import { StudySidebar } from "@/components/study/StudySidebar";
import { GoalDatePicker } from "@/components/goals/GoalDatePicker";
import { useHubCourseQuery, useHubSectionsQuery } from "@/hooks/useHub";
import { useStudyStateQuery } from "@/hooks/useStudy";
import { useCourseProgressQuery } from "@/hooks/useProgress";

export default function StudyPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useModeAwareNavigate();

  const { data: course, isLoading: courseLoading } = useHubCourseQuery(courseId ?? "");
  const { data: sections, isLoading: sectionsLoading } =
    useHubSectionsQuery(courseId);
  const { data: studyState } = useStudyStateQuery(courseId);
  const { data: progress } = useCourseProgressQuery(courseId);
  const [goalPickerOpen, setGoalPickerOpen] = useState(false);

  const isLoading = courseLoading || sectionsLoading;

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

  const allLessons = sections?.flatMap((s) => s.lessons) ?? [];

  // Determine where to continue
  const resumeLessonId =
    studyState?.last_lesson_id ?? (allLessons.length > 0 ? allLessons[0].id : null);

  const handleContinue = () => {
    if (resumeLessonId && courseId) {
      navigate(`/study/${courseId}/lessons/${resumeLessonId}`);
    }
  };

  const handleSelectLesson = (lessonId: string) => {
    if (courseId) {
      navigate(`/study/${courseId}/lessons/${lessonId}`);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      {/* Back navigation */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
          className="gap-1.5 text-text-secondary"
        >
          <ArrowLeft className="size-3.5" />
          Back to Dashboard
        </Button>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Main content */}
        <div className="min-w-0 flex-1">
          {/* Course hero */}
          <StudyHero
            course={course}
            progress={progress}
            hasStudyState={!!studyState?.last_lesson_id}
            onContinue={handleContinue}
            onEditGoal={() => setGoalPickerOpen(true)}
          />

          {/* Section overview cards */}
          {sections && (
            <StudySectionList sections={sections} progress={progress} />
          )}
        </div>

        {/* Sidebar — section tree */}
        <aside className="w-full shrink-0 lg:w-64">
          <div className="sticky top-4 rounded-xl border border-border-default bg-bg-secondary p-2">
            <div className="mb-2 px-2.5 py-1.5">
              <span className="text-xs font-medium text-text-tertiary">
                Contents
              </span>
            </div>
            <StudySidebar
              sections={sections ?? []}
              selectedLessonId={null}
              onSelectLesson={handleSelectLesson}
              lessonProgress={progress?.lesson_progress}
            />
          </div>
        </aside>
      </div>

      {/* Goal date picker */}
      {course && (
        <GoalDatePicker
          courseId={course.id}
          courseTitle={course.title}
          currentGoalDate={course.goal_date}
          open={goalPickerOpen}
          onOpenChange={setGoalPickerOpen}
        />
      )}
    </div>
  );
}
