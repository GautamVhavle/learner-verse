/**
 * HTTP client wrapper around fetch for the LearnerVerse REST API.
 *
 * In multi-user mode, a token getter is injected by the AuthProvider
 * to attach Auth0 access tokens to every request.
 */
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

/** Exported for streaming transport and other direct fetch use cases. */
export { API_BASE_URL };

class ApiError extends Error {
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

export function setAccessTokenGetter(getter: (() => Promise<string>) | null) {
  _getAccessToken = getter;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  if (!_getAccessToken) return {};
  try {
    const token = await _getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

/** Exported for use by streaming transport (chat). */
export { getAuthHeaders };

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const authHeaders = await getAuthHeaders();
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, body.detail ?? "Request failed");
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: async <T>(path: string, file: File): Promise<T> => {
    const url = `${API_BASE_URL}${path}`;
    const form = new FormData();
    form.append("file", file);
    const authHeaders = await getAuthHeaders();
    const res = await fetch(url, { method: "POST", body: form, headers: authHeaders });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ detail: res.statusText }));
      throw new ApiError(res.status, body.detail ?? "Upload failed");
    }
    return res.json();
  },
};

export { ApiError };
