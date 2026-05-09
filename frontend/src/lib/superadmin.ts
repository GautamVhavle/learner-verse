/**
 * Superadmin identity utilities.
 *
 * The set of superadmin emails is injected at build time via the
 * VITE_SUPERADMIN_EMAILS environment variable (comma-separated).
 * This is a client-side UX guard only — all actual superadmin API
 * endpoints are protected server-side by the `get_superadmin_user`
 * FastAPI dependency.
 */

const _raw = import.meta.env.VITE_SUPERADMIN_EMAILS ?? "";

/** Normalised lowercase set of superadmin email addresses. */
const SUPERADMIN_EMAIL_SET = new Set<string>(
  _raw
    .split(",")
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean),
);

/**
 * Returns true when `email` belongs to the configured superadmin list.
 * Case-insensitive comparison.
 */
export function isSuperadmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return SUPERADMIN_EMAIL_SET.has(email.toLowerCase());
}
