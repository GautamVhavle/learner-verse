/**
 * Route guard that redirects unauthenticated users to the login page.
 */
import { Navigate } from "react-router";
import type { ReactNode } from "react";
import { SINGLE_USER_MODE } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  if (SINGLE_USER_MODE) {
    return <>{children}</>;
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-root">
        <div className="text-sm text-text-secondary">Loading…</div>
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
