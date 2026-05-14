/**
 * URL safety utilities for user-supplied links.
 *
 * Enforces http/https-only protocol allowlist to prevent
 * javascript:, data:, and other dangerous URI schemes.
 */

/** Returns the URL unchanged if it uses http or https, otherwise returns "#". */
export function safeExternalUrl(url: string | null | undefined): string {
  if (!url) return "#";
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return url;
    }
    return "#";
  } catch {
    return "#";
  }
}

/**
 * Returns a safe display domain for a URL.
 * Falls back to empty string on invalid URLs instead of throwing.
 */
export function safeDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "";
  }
}
