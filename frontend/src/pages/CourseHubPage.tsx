/**
 * Course Hub page — public course discovery with search, filters, and ratings.
 */
import { useState, useDeferredValue } from "react";
import { useNavigate } from "react-router";
import { Search, SlidersHorizontal, Globe, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { HubCourseCard } from "@/components/hub/HubCourseCard";
import { useHubCoursesQuery } from "@/hooks/useHub";
import { useMode } from "@/hooks/useMode";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "title", label: "A–Z" },
] as const;

const PER_PAGE = 20;

export default function CourseHubPage() {
  const navigate = useNavigate();
  const { mode } = useMode();
  const modePrefix = mode === "creator" ? "/creator" : "/learner";

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest" | "title">("newest");
  const [page, setPage] = useState(1);

  const deferredSearch = useDeferredValue(search);

  const { data, isLoading } = useHubCoursesQuery({
    search: deferredSearch || undefined,
    sort,
    page,
    per_page: PER_PAGE,
  });

  const courses = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Globe className="size-6 text-accent-blue" />
          <h1 className="text-2xl font-semibold text-text-primary">Course Hub</h1>
        </div>
        <p className="mt-1 text-sm text-text-secondary">
          Discover and enroll in courses published by the community.
        </p>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-tertiary" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search courses..."
            className="pl-9"
            data-testid="hub-search"
          />
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-text-tertiary" />
          {SORT_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={sort === opt.value ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setSort(opt.value);
                setPage(1);
              }}
              className="text-xs"
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Results count */}
      {!isLoading && (
        <p className="text-xs text-text-tertiary">
          {total} course{total !== 1 ? "s" : ""} available
        </p>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-text-tertiary" />
        </div>
      )}

      {/* Course Grid */}
      {!isLoading && courses.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {courses.map((course) => (
            <HubCourseCard
              key={course.id}
              course={course}
              onClick={() => navigate(`${modePrefix}/hub/${course.id}`)}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && courses.length === 0 && (
        <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl border border-border-default bg-bg-secondary">
          <Globe className="size-10 text-text-tertiary" />
          <p className="text-sm text-text-secondary">
            {search ? "No courses match your search." : "No public courses available yet."}
          </p>
          {search && (
            <Button variant="outline" size="sm" onClick={() => setSearch("")}>
              Clear search
            </Button>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-xs text-text-secondary">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
