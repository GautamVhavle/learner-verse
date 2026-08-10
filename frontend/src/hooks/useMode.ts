/**
 * Hook for switching between creator and learner application modes.
 */
import { useModeStore, type AppMode } from "@/stores/modeStore";
import { useLocation } from "react-router";

interface UseModeReturn {
  mode: AppMode;
  toggleMode: () => void;
  setMode: (mode: AppMode) => void;
  isCreator: boolean;
  isLearner: boolean;
}

export function useMode(): UseModeReturn {
  const { pathname } = useLocation();
  const { mode: preferredMode, toggleMode, setMode } = useModeStore();
  // Application routes are the source of truth once the user is inside a
  // mode-specific shell. The persisted value remains useful on public pages,
  // but must never make /creator render learner controls (or vice versa).
  const mode: AppMode =
    pathname === "/creator" || pathname.startsWith("/creator/")
      ? "creator"
      : pathname === "/learner" || pathname.startsWith("/learner/")
        ? "student"
        : preferredMode;

  return {
    mode,
    toggleMode,
    setMode,
    isCreator: mode === "creator",
    isLearner: mode === "student",
  };
}
