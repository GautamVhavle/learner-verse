/**
 * Redirect page that routes to the appropriate dashboard based on current mode.
 * This is the fallback when accessing the root "/" path.
 *
 * In multi-user mode, waits for Auth0 to finish processing the OAuth
 * callback (code + state query params) before navigating away.
 */
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { SINGLE_USER_MODE } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
import { useMode } from "@/hooks/useMode";
import { Loader2 } from "lucide-react";

export default function ModeRedirectPage() {
  const navigate = useNavigate();
  const { mode } = useMode();
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    // Wait for Auth0 to finish processing the callback before navigating
    if (!SINGLE_USER_MODE && !isLoaded) return;

    if (!SINGLE_USER_MODE && !isSignedIn) {
      navigate("/login", { replace: true });
      return;
    }

    const path = mode === "creator" ? "/creator" : "/learner";
    navigate(path, { replace: true });
  }, [mode, navigate, isLoaded, isSignedIn]);

  if (!SINGLE_USER_MODE && !isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-root">
        <Loader2 className="size-6 animate-spin text-text-tertiary" />
      </div>
    );
  }

  return null;
}
