/**
 * React Query hook for full-text search across courses and lessons.
 */
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { SearchResponse } from "@/types/search";

const SEARCH_KEY = ["search"] as const;

export function useSearchQuery(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: [...SEARCH_KEY, trimmed],
    queryFn: () =>
      api.get<SearchResponse>(
        `/search?q=${encodeURIComponent(trimmed)}&limit=20`,
      ),
    enabled: trimmed.length >= 1,
    staleTime: 30_000,
  });
}
