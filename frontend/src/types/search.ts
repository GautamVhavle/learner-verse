/**
 * TypeScript types for the full-text search API response.
 */
export interface SearchResultItem {
  id: string;
  type: "course" | "lesson" | "section" | "note";
  title: string;
  description: string | null;
  breadcrumb: string;
  url: string;
}

export interface SearchResponse {
  results: SearchResultItem[];
  query: string;
  total: number;
}
