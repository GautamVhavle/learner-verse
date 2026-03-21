/**
 * Debounced auto-save hook with status tracking (idle, saving, saved, error).
 */
import { useState, useEffect, useRef, useCallback } from "react";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  debounceMs?: number;
  enabled?: boolean;
}

export function useAutoSave<T>({
  data,
  onSave,
  debounceMs = 2000,
  enabled = true,
}: UseAutoSaveOptions<T>) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const prevDataRef = useRef<string>("");
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const save = useCallback(
    async (toSave: T) => {
      setStatus("saving");
      try {
        await onSave(toSave);
        setStatus("saved");
        // Reset to idle after 2s
        savedTimerRef.current = setTimeout(() => setStatus("idle"), 2000);
      } catch {
        setStatus("error");
      }
    },
    [onSave]
  );

  useEffect(() => {
    if (!enabled) return;

    const serialized = JSON.stringify(data);
    // Skip if data hasn't changed from last save
    if (serialized === prevDataRef.current) return;

    // Skip the initial render (no previous data)
    if (!prevDataRef.current) {
      prevDataRef.current = serialized;
      return;
    }

    prevDataRef.current = serialized;

    // Clear existing timers
    if (timerRef.current) clearTimeout(timerRef.current);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);

    timerRef.current = setTimeout(() => {
      save(data);
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [data, debounceMs, enabled, save]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  return { status };
}
