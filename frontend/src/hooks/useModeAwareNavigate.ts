/**
 * Hook for mode-aware navigation.
 * Automatically prepends the current mode prefix (/creator or /learner) to navigation paths.
 */
import { useNavigate as useReactNavigate, useLocation } from "react-router";
import type { NavigateOptions } from "react-router";

export function useModeAwareNavigate() {
  const navigate = useReactNavigate();
  const location = useLocation();

  // Extract mode from current pathname
  const mode = location.pathname.startsWith("/creator")
    ? "creator"
    : location.pathname.startsWith("/learner")
      ? "learner"
      : "creator"; // fallback

  const modeAwareNavigate = (path: string | number, options?: NavigateOptions) => {
    // If path is a number (for history navigation), pass it through
    if (typeof path === "number") {
      navigate(path);
      return;
    }

    // If path already has a mode prefix or is an absolute URL, use as-is
    if (path.startsWith("/creator") || path.startsWith("/learner") || path.startsWith("http")) {
      navigate(path, options);
      return;
    }

    // Otherwise, prepend the current mode
    const modePrefix = mode === "creator" ? "/creator" : "/learner";
    navigate(`${modePrefix}${path}`, options);
  };

  return modeAwareNavigate;
}
