/**
 * Detects the user's OS/device type for platform-aware UI.
 *
 * - isMac    → macOS desktop/laptop
 * - isWindows → Windows desktop/laptop
 * - isMobile → any phone/tablet (hides keyboard shortcuts)
 */
export function usePlatform() {
  const ua = navigator.userAgent;
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ??
    navigator.platform ??
    "";

  // iPads on iOS 13+ report platform as "MacIntel" but have touch points
  const isMobile =
    /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
    /iPad/i.test(ua) ||
    (/MacIntel/i.test(platform) && navigator.maxTouchPoints > 1);

  const isMac = !isMobile && /^Mac/i.test(platform);
  const isWindows = !isMobile && /^Win/i.test(platform);

  /**
   * Returns "⌘" on Mac, "Ctrl" on other platforms.
   * Used to render modifier keys in shortcut hints.
   */
  const mod = isMac ? "⌘" : "Ctrl";
  const shift = isMac ? "⇧" : "Shift";
  const alt = isMac ? "⌥" : "Alt";

  return { isMac, isWindows, isMobile, mod, shift, alt };
}
