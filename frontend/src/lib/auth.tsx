/**
 * Authentication provider and helpers supporting Auth0 and single-user mode.
 */
import { Auth0Provider, useAuth0 } from "@auth0/auth0-react";
import { useEffect, useState, type ReactNode } from "react";
import { setAccessTokenGetter, setUnauthorizedHandler } from "@/lib/api";

const SINGLE_USER_MODE = import.meta.env.VITE_SINGLE_USER_MODE === "true";
const AUTH0_DOMAIN = import.meta.env.VITE_AUTH0_DOMAIN;
const AUTH0_CLIENT_ID = import.meta.env.VITE_AUTH0_CLIENT_ID;
const AUTH0_AUDIENCE = import.meta.env.VITE_AUTH0_AUDIENCE;

/**
 * Single-user context: pretend user is always authenticated.
 */
const SINGLE_USER = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "local@learnerverse.dev",
  displayName: "Local User",
  avatarUrl: null,
} as const;

export { SINGLE_USER_MODE, SINGLE_USER };

/**
 * Syncs the Auth0 getAccessTokenSilently into the API client
 * so every fetch call includes the Bearer token.
 * Also registers a global 401 handler: if the backend returns 401
 * (e.g. refresh token expired, session revoked), the user is sent
 * back to the Auth0 login page automatically.
 * Delays rendering children until auth state is resolved to prevent
 * queries from firing before the token is available.
 */
function AuthTokenSync({ children }: { children: ReactNode }) {
  const { getAccessTokenSilently, loginWithRedirect, isAuthenticated, isLoading } = useAuth0();
  const [tokenReady, setTokenReady] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated) {
      setAccessTokenGetter(() => getAccessTokenSilently());
      // Redirect to login when any request gets a 401 from the backend.
      // This handles expired refresh tokens and revoked sessions.
      setUnauthorizedHandler(() => loginWithRedirect());
    } else {
      setAccessTokenGetter(null);
      setUnauthorizedHandler(null);
    }
    setTokenReady(true);

    return () => {
      setAccessTokenGetter(null);
      setUnauthorizedHandler(null);
    };
  }, [isAuthenticated, isLoading, getAccessTokenSilently, loginWithRedirect]);

  if (!tokenReady) {
    return null;
  }

  return <>{children}</>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  if (SINGLE_USER_MODE) {
    return <>{children}</>;
  }

  if (!AUTH0_DOMAIN || !AUTH0_CLIENT_ID) {
    throw new Error(
      "VITE_AUTH0_DOMAIN and VITE_AUTH0_CLIENT_ID are required when SINGLE_USER_MODE is off",
    );
  }

  return (
    <Auth0Provider
      domain={AUTH0_DOMAIN}
      clientId={AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: window.location.origin,
        ...(AUTH0_AUDIENCE ? { audience: AUTH0_AUDIENCE } : {}),
      }}
      useRefreshTokens
      cacheLocation="localstorage"
    >
      <AuthTokenSync>{children}</AuthTokenSync>
    </Auth0Provider>
  );
}
