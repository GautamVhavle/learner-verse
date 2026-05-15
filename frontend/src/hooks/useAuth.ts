/**
 * Authentication hook that abstracts over Auth0 and single-user mode.
 */
import { SINGLE_USER, SINGLE_USER_MODE } from "@/lib/auth";
import { useMaybeAuth0 } from "@/hooks/useMaybeAuth0";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

interface UseAuthReturn {
  user: AuthUser | null;
  isLoaded: boolean;
  isSignedIn: boolean;
}

export function useAuth(): UseAuthReturn {
  const auth0 = useMaybeAuth0();

  if (SINGLE_USER_MODE || !auth0) {
    return {
      user: SINGLE_USER,
      isLoaded: true,
      isSignedIn: true,
    };
  }

  const { user, isLoading, isAuthenticated, error } = auth0;

  if (error) {
    console.error("[Auth0 error]", error.message);
  }

  if (isLoading || !isAuthenticated || !user) {
    return { user: null, isLoaded: !isLoading, isSignedIn: isAuthenticated };
  }

  return {
    user: {
      id: user.sub ?? "",
      email: user.email ?? "",
      displayName: user.name ?? user.nickname ?? "User",
      avatarUrl: user.picture ?? null,
    },
    isLoaded: true,
    isSignedIn: true,
  };
}
