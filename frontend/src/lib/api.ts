/**
 * HTTP client wrapper around fetch for the LearnerVerse REST API.
 *
 * In multi-user mode, a token getter is injected by the AuthProvider
 * to attach Auth0 access tokens to every request.
 */

/** Base URL for all API requests. Exported for streaming transport. */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

/** Token getter injected at runtime by AuthTokenSync. */
let _getAccessToken: (() => Promise<string>) | null = null;

/** Called when the backend returns 401. Injected by AuthTokenSync. */
let _onUnauthorized: (() => void) | null = null;

export function setAccessTokenGetter(getter: (() => Promise<string>) | null) {
  _getAccessToken = getter;
}

/**
 * Register a callback invoked when any API request receives a 401.
 * Used by AuthTokenSync to redirect the user to re-authenticate
 * when their session has expired.
 */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  _onUnauthorized = handler;
}

/** Build auth headers for requests. Exported for streaming transport. */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  if (!_getAccessToken) return {};
  try {
    const token = await _getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

/**
 * Core request function. Handles auth headers, JSON parsing, and errors.
 * Returns `void` (typed as `undefined`) for 204 No Content responses.
 */
async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const authHeaders = await getAuthHeaders();

  /* Only set Content-Type for JSON bodies — skip for FormData (browser sets boundary). */
  const contentHeaders: Record<string, string> =
    options.body && !(options.body instanceof FormData)
      ? { "Content-Type": "application/json" }
      : {};

  const res = await fetch(url, {
    ...options,
    headers: {
      ...contentHeaders,
      ...authHeaders,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    const error = new ApiError(res.status, body.detail ?? "Request failed");
    // Notify the auth layer so it can redirect to login on session expiry.
    if (res.status === 401 && _onUnauthorized) {
      _onUnauthorized();
    }
    throw error;
  }

  /* 204 No Content — nothing to parse. */
  if (res.status === 204) return undefined as unknown as T;
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),

  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),

  /** Upload a file via multipart/form-data. Uses the shared request pipeline. */
  upload: <T>(path: string, file: File): Promise<T> => {
    const form = new FormData();
    form.append("file", file);
    return request<T>(path, { method: "POST", body: form });
  },
};
