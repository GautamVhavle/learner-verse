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
      <div className="bg-accent-purple/10 flex size-6 shrink-0 items-center justify-center rounded-full">
        <Sparkles className="text-accent-purple size-3 animate-pulse" />
      </div>

      {/* Shimmer block */}
      <div className="flex flex-col gap-2 pt-1">
        <div className="flex items-center gap-2">
          <span className="text-text-tertiary text-xs font-medium">Thinking</span>
          <div className="flex gap-0.5">
            <span className="bg-accent-purple/60 size-1 animate-bounce rounded-full [animation-delay:0ms]" />
            <span className="bg-accent-purple/60 size-1 animate-bounce rounded-full [animation-delay:150ms]" />
            <span className="bg-accent-purple/60 size-1 animate-bounce rounded-full [animation-delay:300ms]" />
          </div>
        </div>
        {/* Shimmer bars */}
        <div className="space-y-1.5">
          <div className="bg-bg-tertiary h-2 w-48 animate-pulse rounded-full" />
          <div className="bg-bg-tertiary h-2 w-32 animate-pulse rounded-full [animation-delay:150ms]" />
        </div>
      </div>
    </div>
  );
}
