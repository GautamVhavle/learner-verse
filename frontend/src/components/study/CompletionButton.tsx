/**
 * Toggle button for marking a lesson as complete or incomplete.
 */
import { Check, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToggleProgressMutation } from "@/hooks/useProgress";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useCallback, useMemo } from "react";

interface CompletionButtonProps {
  lessonId: string;
  completed: boolean;
  onToggled?: (newCompleted: boolean) => void;
  /** When true the course is fully completed - no toggling allowed */
  locked?: boolean;
}

export function CompletionButton({
  lessonId,
  completed,
  onToggled,
  locked = false,
}: CompletionButtonProps) {
  const toggle = useToggleProgressMutation();

  const handleToggle = useCallback(() => {
    if (locked) return;
    const newState = !completed;
    toggle.mutate(
      { lessonId, data: { completed: newState } },
      { onSuccess: () => onToggled?.(newState) },
    );
  }, [lessonId, completed, toggle, onToggled, locked]);

  const shortcuts = useMemo(
    () => [
      {
        key: "m",
        action: handleToggle,
        description: "Toggle lesson completion",
      },
    ],
    [handleToggle],
  );

  useKeyboardShortcuts(shortcuts);

  // Course completed & locked - show a non-interactive "Completed" badge
  if (locked) {
    return (
      <div
        className="bg-accent-green/15 text-accent-green border-accent-green/25 inline-flex cursor-default items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium"
        title="Course completed"
      >
        <Check className="size-4" />
        <span>Completed</span>
      </div>
    );
  }

  if (completed) {
    return (
      <Button
        onClick={handleToggle}
        className="bg-accent-green/15 text-accent-green border-accent-green/25 hover:bg-accent-green/25 cursor-pointer gap-2 border"
        variant="ghost"
        title="Mark as incomplete (M)"
      >
        <Check className="size-4" />
        <span>Completed</span>
      </Button>
    );
  }

  return (
    <Button
      onClick={handleToggle}
      variant="outline"
      className="cursor-pointer gap-2"
      title="Mark as complete (M)"
    >
      <Circle className="size-4" />
      <span>Mark Complete</span>
    </Button>
  );
}
