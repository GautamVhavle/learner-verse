/**
 * Convenience hook for toggling distraction-free focus mode.
 */
import { useFocusModeStore } from "@/stores/focusModeStore";

export function useFocusMode() {
  const { focusMode, toggleFocusMode, setFocusMode } = useFocusModeStore();
  return { focusMode, toggleFocusMode, setFocusMode };
}
