/**
 * Authentication provider and helpers supporting Auth0 and single-user mode.
 */
import { Auth0Provider, useAuth0 } from "@auth0/auth0-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { setAccessTokenGetter, setUnauthorizedHandler, api } from "@/lib/api";

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
  const { getAccessTokenSilently, loginWithRedirect, isAuthenticated, isLoading, user } = useAuth0();
  const [tokenReady, setTokenReady] = useState(false);
  const profileSynced = useRef(false);

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

  // Sync Auth0 profile (name, email, avatar) to the backend on first login.
  // This runs once after the token is ready and the Auth0 user object is available.
  useEffect(() => {
    if (!tokenReady || !isAuthenticated || !user || profileSynced.current) return;
    profileSynced.current = true;

    (async () => {
      try {
        const profile = await api.get<{ display_name: string; email: string; avatar_url: string | null }>("/auth/me");
        const needsSync =
          profile.display_name === "New User" ||
          profile.email.endsWith("@auth0.user");

        if (needsSync) {
          const updates: Record<string, string> = {};
          if (user.name && profile.display_name === "New User") {
            updates.display_name = user.name;
          }
          if (user.picture && !profile.avatar_url) {
            updates.avatar_url = user.picture;
          }
          if (Object.keys(updates).length > 0) {
            await api.put("/auth/me", updates);
          }
          // Email requires a separate backend update since it's not in UserUpdate schema.
          // We handle it via the new /auth/me/sync endpoint.
          if (user.email && profile.email.endsWith("@auth0.user")) {
            await api.post("/auth/me/sync", { email: user.email }).catch(() => {});
          }
        }
      } catch {
        // Non-critical — profile sync failure shouldn't block the app.
      }
    })();
  }, [tokenReady, isAuthenticated, user]);

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

  const handleRedirectCallback = (appState: any) => {
    // After Auth0 login, redirect to the intended destination (default: creator dashboard)
    const returnTo = appState?.returnTo || "/creator";
    window.location.replace(returnTo);
  };

  return (
    <Auth0Provider
      domain={AUTH0_DOMAIN}
      clientId={AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: window.location.origin,
        ...(AUTH0_AUDIENCE ? { audience: AUTH0_AUDIENCE } : {}),
      }}
      onRedirectCallback={handleRedirectCallback}
      useRefreshTokens
      cacheLocation="localstorage"
    >
      <AuthTokenSync>{children}</AuthTokenSync>
    </Auth0Provider>
  );
}
