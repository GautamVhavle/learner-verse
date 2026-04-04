/**
 * YouTube URL parsing and video-ID extraction utilities.
 */
const YOUTUBE_PATTERNS = [
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?.*v=([\w-]{11})/,
  /(?:https?:\/\/)?youtu\.be\/([\w-]{11})/,
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([\w-]{11})/,
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([\w-]{11})/,
];

/**
 * Extract a YouTube video ID from various URL formats.
 * Returns null if the URL is not a valid YouTube link.
 */
export function extractVideoId(url: string): string | null {
  for (const pattern of YOUTUBE_PATTERNS) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

/**
 * Check if a string is a valid YouTube URL.
 */
export function isYouTubeUrl(url: string): boolean {
  return extractVideoId(url) !== null;
}

/** Regex for a valid YouTube video ID (11 alphanumeric + hyphen/underscore chars). */
const VIDEO_ID_PATTERN = /^[\w-]{11}$/;

/**
 * Build the embed URL for a YouTube video.
 * Throws if `videoId` doesn't match the expected 11-character pattern.
 */
export function getEmbedUrl(videoId: string): string {
  if (!VIDEO_ID_PATTERN.test(videoId)) {
    throw new Error(`Invalid YouTube video ID: "${videoId}"`);
  }
  return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
}

/**
 * Build a thumbnail URL for a YouTube video.
 * Throws if `videoId` doesn't match the expected 11-character pattern.
 */
export function getThumbnailUrl(
  videoId: string,
  quality: "default" | "hqdefault" | "maxresdefault" = "hqdefault",
): string {
  if (!VIDEO_ID_PATTERN.test(videoId)) {
    throw new Error(`Invalid YouTube video ID: "${videoId}"`);
  }
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}
