/**
 * Inline status indicator showing save progress (saving, saved, error).
 */
import { Check, Loader2, AlertCircle } from "lucide-react";

interface SaveIndicatorProps {
  status: "idle" | "saving" | "saved" | "error";
}

export function SaveIndicator({ status }: SaveIndicatorProps) {
  if (status === "idle") return null;

  return (
    <span className="flex items-center gap-1.5 text-xs">
      {status === "saving" && (
        <>
          <Loader2 className="size-3 animate-spin text-text-tertiary" />
          <span className="text-text-tertiary">Saving…</span>
        </>
      )}
      {status === "saved" && (
        <>
          <Check className="size-3 text-accent-green" />
          <span className="text-accent-green">Saved</span>
        </>
      )}
      {status === "error" && (
        <>
          <AlertCircle className="size-3 text-accent-red" />
          <span className="text-accent-red">Save failed</span>
        </>
      )}
    </span>
  );
}
