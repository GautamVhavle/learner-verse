/**
 * Hook that copies text to the clipboard and tracks the "copied" state.
 *
 * Returns `{ copied, copyToClipboard }`.
 * `copied` resets to `false` after `resetMs` (default 2 000 ms).
 */
import { useState, useCallback, useRef } from "react";

const DEFAULT_RESET_MS = 2000;

export function useCopyToClipboard(resetMs = DEFAULT_RESET_MS) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const copyToClipboard = useCallback(
    async (text: string) => {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), resetMs);
    },
    [resetMs],
  );

  return { copied, copyToClipboard } as const;
}
