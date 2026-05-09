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
      className="group border-border-default bg-bg-secondary hover:border-border-hover flex flex-col overflow-hidden rounded-xl border text-left transition-all hover:shadow-lg"
    >
      {/* Thumbnail */}
      <div className="bg-bg-tertiary relative aspect-video w-full overflow-hidden">
        {course.thumbnail_url ? (
          <img
            src={course.thumbnail_url}
            alt={course.title}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <BookOpen className="text-text-tertiary size-10" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
          <Play className="size-10 text-white opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-text-primary line-clamp-2 text-sm font-semibold">{course.title}</h3>

        {course.creator_name && (
          <p className="text-text-secondary text-xs">by {course.creator_name}</p>
        )}

        {course.description && (
          <p className="text-text-tertiary line-clamp-2 text-xs">{course.description}</p>
        )}

        {/* Tags */}
        {course.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {course.tags.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="bg-bg-tertiary text-text-secondary rounded-full px-2 py-0.5 text-[10px] font-medium"
              >
                {tag.name}
              </span>
            ))}
            {course.tags.length > 3 && (
              <span className="text-text-tertiary text-[10px]">+{course.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Stats row */}
        <div className="text-text-secondary mt-auto flex items-center gap-3 pt-2 text-xs">
          {course.is_public && (
            <div className="flex items-center gap-1">
              <StarRating value={course.average_rating} readOnly size="sm" />
              <span className="font-medium">
                {course.average_rating > 0 ? course.average_rating.toFixed(1) : "—"}
              </span>
              {course.rating_count > 0 && (
                <span className="text-text-tertiary">({course.rating_count})</span>
              )}
            </div>
          )}
          {course.is_public && (
            <div className="flex items-center gap-1">
              <Users className="size-3" />
              <span>{course.enrollment_count}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Layers className="size-3" />
            <span>{course.lesson_count} lessons</span>
          </div>
        </div>
      </div>
    </button>
  );
}
