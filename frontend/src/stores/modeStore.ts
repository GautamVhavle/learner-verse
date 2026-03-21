/**
 * Zustand store for the creator/learner application mode, persisted to localStorage.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AppMode = "creator" | "student";

interface ModeState {
  mode: AppMode;
  toggleMode: () => void;
  setMode: (mode: AppMode) => void;
}

export const useModeStore = create<ModeState>()(
  persist(
    (set) => ({
      mode: "creator",
      toggleMode: () =>
        set((state) => ({
          mode: state.mode === "creator" ? "student" : "creator",
        })),
      setMode: (mode) => set({ mode }),
    }),
    { name: "learnerverse-mode" },
  ),
);
