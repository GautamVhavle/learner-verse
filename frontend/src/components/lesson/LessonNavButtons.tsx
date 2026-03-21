/**
 * Prev / Next lesson navigation buttons.
 *
 * Shown at the bottom of the lesson content area. Hidden in focus
 * mode (replaced by the FocusOverlay bar).
 */
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Lesson } from "@/types/section";

interface LessonNavButtonsProps {
  prevLesson: Lesson | null;
  nextLesson: Lesson | null;
  onNavigate: (lessonId: string) => void;
}

export function LessonNavButtons({
  prevLesson,
  nextLesson,
  onNavigate,
}: LessonNavButtonsProps) {
  return (
    <div className="flex items-center justify-between border-t border-border-default pt-4">
      {prevLesson ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onNavigate(prevLesson.id)}
          className="gap-1.5 text-text-secondary"
        >
          <ArrowLeft className="size-3.5" />
          <span className="max-w-[140px] truncate">{prevLesson.title}</span>
        </Button>
      ) : (
        <div />
      )}
      {nextLesson && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onNavigate(nextLesson.id)}
          className="gap-1.5 text-text-secondary"
        >
          <span className="max-w-[140px] truncate">{nextLesson.title}</span>
          <ChevronRight className="size-3.5" />
        </Button>
      )}
    </div>
  );
}
