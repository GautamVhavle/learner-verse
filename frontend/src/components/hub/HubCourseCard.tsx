/**
 * Course card for the Course Hub — shows thumbnail, rating, enrollment count, and tags.
 */
import { BookOpen, Users, Layers, Play } from "lucide-react";
import { StarRating } from "./StarRating";
import type { Course } from "@/types/course";

interface HubCourseCardProps {
  course: Course;
  onClick: () => void;
}

export function HubCourseCard({ course, onClick }: HubCourseCardProps) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col overflow-hidden rounded-xl border border-border-default bg-bg-secondary text-left transition-all hover:border-border-hover hover:shadow-lg"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-bg-tertiary">
        {course.thumbnail_url ? (
          <img
            src={course.thumbnail_url}
            alt={course.title}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <BookOpen className="size-10 text-text-tertiary" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
          <Play className="size-10 text-white opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-sm font-semibold text-text-primary">
          {course.title}
        </h3>

        {course.creator_name && (
          <p className="text-xs text-text-secondary">
            by {course.creator_name}
          </p>
        )}

        {course.description && (
          <p className="line-clamp-2 text-xs text-text-tertiary">
            {course.description}
          </p>
        )}

        {/* Tags */}
        {course.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {course.tags.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="rounded-full bg-bg-tertiary px-2 py-0.5 text-[10px] font-medium text-text-secondary"
              >
                {tag.name}
              </span>
            ))}
            {course.tags.length > 3 && (
              <span className="text-[10px] text-text-tertiary">
                +{course.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Stats row */}
        <div className="mt-auto flex items-center gap-3 pt-2 text-xs text-text-secondary">
          <div className="flex items-center gap-1">
            <StarRating value={course.average_rating} readOnly size="sm" />
            <span className="font-medium">{course.average_rating > 0 ? course.average_rating.toFixed(1) : "—"}</span>
            {course.rating_count > 0 && (
              <span className="text-text-tertiary">({course.rating_count})</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Users className="size-3" />
            <span>{course.enrollment_count}</span>
          </div>
          <div className="flex items-center gap-1">
            <Layers className="size-3" />
            <span>{course.lesson_count} lessons</span>
          </div>
        </div>
      </div>
    </button>
  );
}
