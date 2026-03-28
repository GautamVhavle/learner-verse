/**
 * Zustand store for light/dark theme state, persisted to localStorage.
 *
 * Manages the `dark` class on `<html>` to drive Tailwind's dark-mode
 * variant and CSS-variable overrides in index.css.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "light" | "dark";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "dark",
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
      toggleTheme: () =>
        set((state) => {
          const next = state.theme === "dark" ? "light" : "dark";
          applyTheme(next);
          return { theme: next };
        }),
    }),
    {
      name: "learnerverse-theme",
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme);
      },
    },
  ),
);
