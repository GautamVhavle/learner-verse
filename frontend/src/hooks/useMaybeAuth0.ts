/**
 * Auth0 hook wrapper that safely returns null in single-user mode.
 *
 * In single-user mode `VITE_SINGLE_USER_MODE=true` is a build-time
 * constant, so the Auth0 branch is dead-code-eliminated by Vite.
 * This wrapper avoids the need for conditional `useAuth0()` calls
 * (which violate the Rules of Hooks) in consumer components.
 */
import { useAuth0 } from "@auth0/auth0-react";
import type { Auth0ContextInterface } from "@auth0/auth0-react";
import { SINGLE_USER_MODE } from "@/lib/auth";

/**
 * Returns the Auth0 context when running in multi-user mode,
 * or `null` in single-user mode.
 */
export function useMaybeAuth0(): Auth0ContextInterface | null {
  if (SINGLE_USER_MODE) {
    return null;
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useAuth0();
}
