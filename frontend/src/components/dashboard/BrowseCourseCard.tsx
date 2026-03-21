/**
 * Course card for the Browse Courses page.
 *
 * Displays thumbnail, title, description, section/lesson counts, and
 * an enroll/unenroll action button. Enrolled courses also get a
 * "Go to Course" button to jump directly to the study view.
 */
import { BookOpen, CheckCircle2, Layers, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Course } from "@/types/course";

interface BrowseCourseCardProps {
  course: Course;
  isEnrolled: boolean;
  isPending: boolean;
  onEnroll: () => void;
  onUnenroll: () => void;
  onStudy: () => void;
}

export function BrowseCourseCard({
  course,
  isEnrolled,
  isPending,
  onEnroll,
  onUnenroll,
  onStudy,
}: BrowseCourseCardProps) {
  return (
    <div className="flex flex-col rounded-xl border border-border-default bg-bg-secondary transition-colors hover:border-border-hover">
      {/* Thumbnail */}
      <div
        className={`group relative aspect-video w-full overflow-hidden rounded-t-xl bg-bg-tertiary ${isEnrolled ? "cursor-pointer" : ""}`}
        onClick={isEnrolled ? onStudy : undefined}
      >
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
        {/* Play overlay shown for enrolled courses on hover */}
        {isEnrolled && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
            <div className="scale-75 rounded-full bg-white/90 p-3 opacity-0 transition-all group-hover:scale-100 group-hover:opacity-100">
              <Play className="size-5 text-black" />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-sm font-semibold text-text-primary">
          {course.title}
        </h3>
        {course.description && (
          <p className="line-clamp-2 text-xs text-text-secondary">
            {course.description}
          </p>
        )}

        {/* Stats row */}
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
            {course.lesson_count}{" "}
            {course.lesson_count === 1 ? "lesson" : "lessons"}
          </span>
        </div>

        {/* Action buttons */}
        <div className="mt-2 flex gap-2">
          {isEnrolled ? (
            <>
              <Button size="sm" className="flex-1 gap-1.5" onClick={onStudy}>
                <Play className="size-3.5" />
                Go to Course
              </Button>
              {/* Unenroll icon button */}
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={onUnenroll}
                title="Unenroll"
              >
                <CheckCircle2 className="size-4 text-green-500" />
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              disabled={isPending}
              onClick={onEnroll}
            >
              {isPending ? "Enrolling…" : "Enroll"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
