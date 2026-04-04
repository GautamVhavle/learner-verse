/**
 * Study page for a single course.
 *
 * Shows a hero card with progress, a list of section cards, a
 * sidebar lesson tree, and a goal date picker dialog.
 */
import { useState } from "react";
import { useParams } from "react-router";
import { useModeAwareNavigate } from "@/hooks/useModeAwareNavigate";
import { ArrowLeft, Loader2, BookOpen, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StudyHero } from "@/components/study/StudyHero";
import { StudySectionList } from "@/components/study/StudySectionList";
import { StudySidebar } from "@/components/study/StudySidebar";
import { GoalDatePicker } from "@/components/goals/GoalDatePicker";
import { DiscussionRoom } from "@/components/discussion/DiscussionRoom";
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
  const [tab, setTab] = useState<"curriculum" | "discussion">("curriculum");

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

          {/* Tab bar — Discussion only for public/published courses */}
          {course.is_public && (
            <div className="mb-4 mt-6 flex gap-1 border-b border-border-default">
              <button
                onClick={() => setTab("curriculum")}
                className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                  tab === "curriculum"
                    ? "border-accent-purple text-accent-purple"
                    : "border-transparent text-text-secondary hover:text-text-primary"
                }`}
              >
                <BookOpen className="size-3.5" />
                Curriculum
              </button>
              <button
                onClick={() => setTab("discussion")}
                className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                  tab === "discussion"
                    ? "border-accent-purple text-accent-purple"
                    : "border-transparent text-text-secondary hover:text-text-primary"
                }`}
              >
                <MessageSquare className="size-3.5" />
                Discussion
              </button>
            </div>
          )}

          {/* Tab content */}
          {tab === "curriculum" || !course.is_public ? (
            sections && (
              <StudySectionList sections={sections} progress={progress} />
            )
          ) : (
            <div className="overflow-hidden rounded-xl border border-border-default bg-bg-primary" style={{ height: "calc(100vh - 320px)", minHeight: 400 }}>
              <DiscussionRoom courseId={courseId!} />
            </div>
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
