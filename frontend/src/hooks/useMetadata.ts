/**
 * React Query mutations for external metadata fetching.
 *
 * Provides hooks for fetching YouTube video metadata (via oEmbed)
 * and OpenGraph data for reference link previews.
 */
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { YouTubeMetadata, OpenGraphData } from "@/types/section";

/** Fetch YouTube video metadata (title, thumbnail, channel) from a URL. */
export function useFetchYouTubeMetadata() {
  return useMutation({
    mutationFn: (url: string) => api.post<YouTubeMetadata>("/youtube/metadata", { url }),
  });
}

/** Fetch OpenGraph preview data (title, description, image) from a URL. */
export function useFetchOpenGraph() {
  return useMutation({
    mutationFn: (url: string) => api.post<OpenGraphData>("/opengraph/fetch", { url }),
  });
}
