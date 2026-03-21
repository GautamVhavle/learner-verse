/**
 * Overlay toolbar shown during focus mode with navigation and exit controls.
 */
import { Minimize2, ChevronLeft, ChevronRight, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FocusOverlayProps {
  onExit: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onShowShortcuts: () => void;
  lessonTitle?: string;
}

export function FocusOverlay({
  onExit,
  onPrev,
  onNext,
  onShowShortcuts,
  lessonTitle,
}: FocusOverlayProps) {
  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="flex items-center gap-1 rounded-full border border-border-default bg-bg-primary/90 px-2 py-1 shadow-lg backdrop-blur-md">
        {/* Prev */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onPrev}
          disabled={!onPrev}
          className="rounded-full"
          title="Previous lesson (P / ←)"
        >
          <ChevronLeft className="size-4" />
        </Button>

        {/* Lesson title */}
        {lessonTitle && (
          <span className="max-w-[200px] truncate px-2 text-xs text-text-secondary">
            {lessonTitle}
          </span>
        )}

        {/* Next */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onNext}
          disabled={!onNext}
          className="rounded-full"
          title="Next lesson (N / →)"
        >
          <ChevronRight className="size-4" />
        </Button>

        {/* Separator */}
        <div className="mx-1 h-4 w-px bg-border-default" />

        {/* Shortcuts */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onShowShortcuts}
          className="rounded-full"
          title="Keyboard shortcuts (?)"
        >
          <Keyboard className="size-3.5" />
        </Button>

        {/* Exit Focus */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onExit}
          className="rounded-full"
          title="Exit focus mode (F / Esc)"
        >
          <Minimize2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
