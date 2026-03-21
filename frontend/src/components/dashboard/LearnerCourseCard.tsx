/**
 * Course card for the learner dashboard.
 *
 * Shows a thumbnail, title, description, progress bar, pace badge,
 * goal date, and section/lesson counts. Clicking navigates to the
 * study view for the course.
 */
import {
  BookOpen,
  CalendarDays,
  Layers,
  Play,
} from "lucide-react";
import { ProgressBar } from "@/components/study/ProgressBar";
import { PaceIndicator } from "@/components/goals/PaceIndicator";
import { useCourseProgressQuery } from "@/hooks/useProgress";
import type { Course } from "@/types/course";

interface LearnerCourseCardProps {
  course: Course;
  onStudy: () => void;
}

export function LearnerCourseCard({ course, onStudy }: LearnerCourseCardProps) {
  const { data: progress } = useCourseProgressQuery(course.id);

  return (
    <div
      className="group flex cursor-pointer flex-col rounded-xl border border-border-default bg-bg-secondary transition-colors hover:border-border-hover"
      onClick={onStudy}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden rounded-t-xl bg-bg-tertiary">
        {course.thumbnail_url ? (
          <img
            src={course.thumbnail_url}
            alt={course.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <BookOpen className="size-8 text-text-tertiary opacity-30" />
          </div>
        )}
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
          <div className="scale-75 rounded-full bg-white/90 p-3 opacity-0 transition-all group-hover:scale-100 group-hover:opacity-100">
            <Play className="size-5 text-black" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-sm font-medium text-text-primary">
          {course.title}
        </h3>
        {course.description && (
          <p className="line-clamp-2 text-xs text-text-secondary">
            {course.description}
          </p>
        )}

        {/* Progress bar */}
        {progress && progress.total_lessons > 0 && (
          <ProgressBar value={progress.percentage} size="sm" className="mt-1" />
        )}

        {/* Pace badge */}
        {progress?.goal && (
          <PaceIndicator goal={progress.goal} compact />
        )}

        {/* Goal date */}
        {course.goal_date && !progress?.goal && (
          <div className="flex items-center gap-1 text-[11px] text-text-tertiary">
            <CalendarDays className="size-3" />
            <span>
              Goal:{" "}
              {new Date(course.goal_date + "T00:00:00").toLocaleDateString(
                undefined,
                { month: "short", day: "numeric" },
              )}
            </span>
          </div>
        )}

        {/* Stats */}
        <div className="mt-auto flex items-center gap-3 pt-2 text-[11px] text-text-tertiary">
          <div className="flex items-center gap-1">
            <Layers className="size-3" />
            <span>
              {course.section_count}{" "}
              {course.section_count === 1 ? "section" : "sections"}
            </span>
          </div>
          <span>&middot;</span>
          <span>
            {progress
              ? `${progress.completed_lessons}/${progress.total_lessons} lessons`
              : `${course.lesson_count} ${course.lesson_count === 1 ? "lesson" : "lessons"}`}
          </span>
        </div>
      </div>
    </div>
  );
}
