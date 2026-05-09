/**
 * Timezone detection and utilities.
 */

/**
 * Detect user's timezone using browser's Intl API.
 * Falls back to UTC if detection fails.
 */
export function detectTimezone(): string {
  try {
    // Intl.DateTimeFormat().resolvedOptions().timeZone uses the browser's OS timezone
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.warn("Failed to detect timezone:", error);
    return "UTC";
  }
}

/**
 * Get all supported timezones, sorted with common ones first.
 */
export function getSortedTimezones(): string[] {
  const allTimezones = Intl.supportedValuesOf("timeZone");

  // Common timezones to prioritize
  const commonTimezones = [
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Anchorage",
    "Pacific/Honolulu",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Europe/Moscow",
    "Asia/Dubai",
    "Asia/Kolkata",
    "Asia/Bangkok",
    "Asia/Singapore",
    "Asia/Hong_Kong",
    "Asia/Shanghai",
    "Asia/Tokyo",
    "Australia/Sydney",
    "Australia/Melbourne",
    "UTC",
  ];

  const common = commonTimezones.filter((tz) => allTimezones.includes(tz));
  const remaining = allTimezones.filter((tz) => !common.includes(tz));

  return [...common, ...remaining];
}

/**
 * Filter timezones with smart search.
 * Prioritizes exact matches and common variations.
 */
export function filterTimezones(query: string, allTimezones: string[]): string[] {
  if (!query.trim()) return allTimezones;

  const searchTerm = query.toLowerCase();

  // Split into exact matches, starts-with matches, and contains matches
  const exactMatches: string[] = [];
  const startsWithMatches: string[] = [];
  const containsMatches: string[] = [];

  for (const tz of allTimezones) {
    const tzLower = tz.toLowerCase();
    if (tzLower === searchTerm) {
      exactMatches.push(tz);
    } else if (tzLower.startsWith(searchTerm)) {
      startsWithMatches.push(tz);
    } else if (tzLower.includes(searchTerm)) {
      containsMatches.push(tz);
    }
  }

  // Return in priority order
  return [...exactMatches, ...startsWithMatches, ...containsMatches];
}

/**
 * Format timezone name for display (replace underscores with spaces).
 */
export function formatTimezoneDisplay(tz: string): string {
  return tz.replace(/_/g, " ");
}

/**
 * Get timezone info with offset.
 */
export function getTimezoneInfo(tz: string): { name: string; offset: string } {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "longOffset",
    });

    const parts = formatter.formatToParts(new Date());
    const offset = parts.find((p) => p.type === "timeZoneName")?.value ?? "";

    return {
      name: formatTimezoneDisplay(tz),
      offset,
    };
  } catch {
    return {
      name: formatTimezoneDisplay(tz),
      offset: "",
    };
  }
}
