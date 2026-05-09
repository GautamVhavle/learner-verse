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
          <Loader2 className="text-text-tertiary size-3 animate-spin" />
          <span className="text-text-tertiary">Saving…</span>
        </>
      )}
      {status === "saved" && (
        <>
          <Check className="text-accent-green size-3" />
          <span className="text-accent-green">Saved</span>
        </>
      )}
      {status === "error" && (
        <>
          <AlertCircle className="text-accent-red size-3" />
          <span className="text-accent-red">Save failed</span>
        </>
      )}
    </span>
  );
}
