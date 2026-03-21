/**
 * Card showing the user's most recent course with a resume button.
 */
import { useModeAwareNavigate } from "@/hooks/useModeAwareNavigate";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/study/ProgressBar";
import type { Course } from "@/types/course";
import type { CourseProgressResponse } from "@/types/progress";
import type { StudyStateResponse } from "@/types/study";

interface ContinueLearningProps {
  course: Course;
  progress: CourseProgressResponse;
  studyState: StudyStateResponse | null;
}

export function ContinueLearning({
  course,
  progress,
  studyState,
}: ContinueLearningProps) {
  const navigate = useModeAwareNavigate();

  const resumePath = studyState?.last_lesson_id
    ? `/study/${course.id}/lessons/${studyState.last_lesson_id}`
    : `/study/${course.id}`;

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border-default bg-gradient-to-br from-bg-secondary to-bg-tertiary p-5 transition-colors hover:border-border-hover">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
            Continue Learning
          </p>
          <h3 className="truncate text-lg font-semibold text-text-primary">
            {course.title}
          </h3>
          <div className="max-w-xs">
            <ProgressBar value={progress.percentage} size="md" showLabel />
          </div>
          <p className="text-xs text-text-tertiary">
            {progress.completed_lessons} of {progress.total_lessons} lessons
            completed
          </p>
        </div>
        <Button
          onClick={() => navigate(resumePath)}
          className="gap-2 shrink-0"
        >
          <Play className="size-4" />
          Resume
        </Button>
      </div>
    </div>
  );
}
