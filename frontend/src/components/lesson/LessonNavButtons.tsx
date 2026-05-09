/**
 * Subtle bottom navigation for lesson pages.
 *
 * Compact inline row: ← prev | progress + complete | next →
 * Designed to blend with the page, not dominate it.
 */
import { ArrowLeft, ArrowRight, Check, Circle } from "lucide-react";
import type { Lesson } from "@/types/section";

interface LessonNavButtonsProps {
  prevLesson: Lesson | null;
  nextLesson: Lesson | null;
  onNavigate: (lessonId: string) => void;
  currentLessonNumber?: number;
  totalLessons?: number;
  isCompleted?: boolean;
  onMarkComplete?: () => void;
  isLoading?: boolean;
}

export function LessonNavButtons({
  prevLesson,
  nextLesson,
  onNavigate,
  currentLessonNumber,
  totalLessons,
  isCompleted = false,
  onMarkComplete,
  isLoading = false,
}: LessonNavButtonsProps) {
  return (
    <div className="border-border-default mt-6 flex items-center justify-between gap-2 border-t pt-4">
      {/* Previous */}
      <button
        onClick={prevLesson ? () => onNavigate(prevLesson.id) : undefined}
        disabled={!prevLesson}
        className={`group flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
          prevLesson
            ? "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
            : "text-text-tertiary/40 cursor-default"
        }`}
      >
        <ArrowLeft className="size-4 flex-shrink-0" />
        <span className="hidden max-w-[120px] truncate sm:inline">
          {prevLesson?.title ?? "Previous"}
        </span>
        <span className="sm:hidden">Prev</span>
      </button>

      {/* Center: progress pill + mark complete */}
      <div className="flex items-center gap-2">
        {currentLessonNumber != null && totalLessons != null && (
          <span className="text-text-tertiary text-xs tabular-nums">
            {currentLessonNumber}/{totalLessons}
          </span>
        )}

        {onMarkComplete && (
          <button
            onClick={onMarkComplete}
            disabled={isLoading}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              isCompleted
                ? "bg-accent-green/10 text-accent-green hover:bg-accent-green/20"
                : "bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20"
            }`}
          >
            {isCompleted ? <Check className="size-3.5" /> : <Circle className="size-3.5" />}
            {isCompleted ? "Completed" : "Complete"}
          </button>
        )}
      </div>

      {/* Next */}
      <button
        onClick={nextLesson ? () => onNavigate(nextLesson.id) : undefined}
        disabled={!nextLesson}
        className={`group flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
          nextLesson
            ? "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
            : "text-text-tertiary/40 cursor-default"
        }`}
      >
        <span className="hidden max-w-[120px] truncate sm:inline">
          {nextLesson?.title ?? "Next"}
        </span>
        <span className="sm:hidden">Next</span>
        <ArrowRight className="size-4 flex-shrink-0" />
      </button>
    </div>
  );
}
