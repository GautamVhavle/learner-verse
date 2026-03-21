/**
 * Hook for switching between creator and learner application modes.
 */
import { useModeStore, type AppMode } from "@/stores/modeStore";

interface UseModeReturn {
  mode: AppMode;
  toggleMode: () => void;
  setMode: (mode: AppMode) => void;
  isCreator: boolean;
  isLearner: boolean;
}

export function useMode(): UseModeReturn {
  const { mode, toggleMode, setMode } = useModeStore();

  return {
    mode,
    toggleMode,
    setMode,
    isCreator: mode === "creator",
    isLearner: mode === "student",
  };
}
