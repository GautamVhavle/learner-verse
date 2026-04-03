/**
 * ThinkingIndicator — animated "LiVi is thinking" state.
 *
 * Shows an animated sparkle icon with a shimmer bar, displayed
 * between the user's message and the assistant's first chunk.
 */
import { Sparkles } from "lucide-react";

export function ThinkingIndicator() {
  return (
    <div className="flex items-start gap-3">
      {/* Avatar */}
      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-purple/10">
        <Sparkles className="size-3 animate-pulse text-accent-purple" />
      </div>

      {/* Shimmer block */}
      <div className="flex flex-col gap-2 pt-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-text-tertiary">Thinking</span>
          <div className="flex gap-0.5">
            <span className="size-1 animate-bounce rounded-full bg-accent-purple/60 [animation-delay:0ms]" />
            <span className="size-1 animate-bounce rounded-full bg-accent-purple/60 [animation-delay:150ms]" />
            <span className="size-1 animate-bounce rounded-full bg-accent-purple/60 [animation-delay:300ms]" />
          </div>
        </div>
        {/* Shimmer bars */}
        <div className="space-y-1.5">
          <div className="h-2 w-48 animate-pulse rounded-full bg-bg-tertiary" />
          <div className="h-2 w-32 animate-pulse rounded-full bg-bg-tertiary [animation-delay:150ms]" />
        </div>
      </div>
    </div>
  );
}
