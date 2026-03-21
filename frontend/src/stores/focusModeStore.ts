/**
 * Zustand store for distraction-free focus mode state.
 */
import { create } from "zustand";

interface FocusModeState {
  focusMode: boolean;
  toggleFocusMode: () => void;
  setFocusMode: (enabled: boolean) => void;
}

export const useFocusModeStore = create<FocusModeState>()((set) => ({
  focusMode: false,
  toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),
  setFocusMode: (focusMode) => set({ focusMode }),
}));
