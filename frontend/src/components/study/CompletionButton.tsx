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
}

export function CompletionButton({ lessonId, completed, onToggled }: CompletionButtonProps) {
  const toggle = useToggleProgressMutation();

  const handleToggle = useCallback(() => {
    const newState = !completed;
    toggle.mutate(
      { lessonId, data: { completed: newState } },
      { onSuccess: () => onToggled?.(newState) },
    );
  }, [lessonId, completed, toggle, onToggled]);

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
