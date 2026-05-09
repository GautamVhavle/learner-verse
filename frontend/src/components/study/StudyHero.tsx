/**
 * Course hero card shown at the top of the study page.
 *
 * Displays the course title, description, section/lesson counts,
 * progress bar, goal/pace indicator, and the Continue/Start button.
 */
import { FileText, Layers, Play, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CourseStatusBadge } from "@/components/course/CourseStatusBadge";
import { ProgressBar } from "@/components/study/ProgressBar";
import { PaceIndicator } from "@/components/goals/PaceIndicator";
import type { Course } from "@/types/course";
import type { CourseProgressResponse } from "@/types/progress";

interface StudyHeroProps {
  course: Course;
  progress: CourseProgressResponse | undefined;
  hasStudyState: boolean;
  onContinue: () => void;
  onEditGoal: () => void;
}

export function StudyHero({
  course,
  progress,
  hasStudyState,
  onContinue,
  onEditGoal,
}: StudyHeroProps) {
  const totalLessons = course.lesson_count ?? 0;

  return (
    <div className="border-border-default bg-bg-secondary rounded-xl border p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-text-primary text-xl font-semibold">{course.title}</h1>
            <CourseStatusBadge status={course.status} />
          </div>
          {course.description && (
            <p className="text-text-secondary mt-2 text-sm leading-relaxed">{course.description}</p>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="text-text-tertiary mt-5 flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <Layers className="size-4" />
          <span>
            {course.section_count} {course.section_count === 1 ? "section" : "sections"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <FileText className="size-4" />
          <span>
            {course.lesson_count} {course.lesson_count === 1 ? "lesson" : "lessons"}
          </span>
        </div>
        {progress && progress.total_lessons > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-text-secondary font-medium">
              {progress.completed_lessons}/{progress.total_lessons} done
            </span>
          </div>
        )}
      </div>

      {/* Course progress bar */}
      {progress && progress.total_lessons > 0 && (
        <div className="mt-4">
          <ProgressBar value={progress.percentage} size="md" showLabel />
        </div>
      )}

      {/* Goal / Pace indicator */}
      {progress?.goal ? (
        <div className="mt-4">
          <PaceIndicator goal={progress.goal} />
          <button
            onClick={onEditGoal}
            className="text-text-tertiary hover:text-accent-blue mt-1.5 text-xs transition-colors"
          >
            Edit goal
          </button>
        </div>
      ) : (
        totalLessons > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onEditGoal}
            className="text-text-tertiary hover:text-accent-blue mt-3 gap-1.5"
          >
            <Target className="size-3.5" />
            Set a learning goal
          </Button>
        )
      )}

      {/* Continue / Start button */}
      {totalLessons > 0 && (
        <Button onClick={onContinue} className="mt-5 gap-2">
          <Play className="size-4" />
          {hasStudyState ? "Continue Learning" : "Start Course"}
        </Button>
      )}
    </div>
  );
}
