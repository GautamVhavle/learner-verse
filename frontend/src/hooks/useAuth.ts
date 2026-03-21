/**
 * Authentication hook that abstracts over Auth0 and single-user mode.
 */
import { useAuth0 } from "@auth0/auth0-react";
import { SINGLE_USER, SINGLE_USER_MODE } from "@/lib/auth";

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
  if (SINGLE_USER_MODE) {
    return {
      user: SINGLE_USER,
      isLoaded: true,
      isSignedIn: true,
    };
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { user, isLoading, isAuthenticated, error } = useAuth0();

  if (error) {
    console.error("[Auth0 error]", error.message, error);
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
