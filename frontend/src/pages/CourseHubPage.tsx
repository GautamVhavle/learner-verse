/**
 * Course Hub page - unified course discovery with public/private tabs.
 *
 * "Public" tab shows all community-published courses.
 * "My Courses" tab shows the current user's own courses with stats.
 */
import { useState, useDeferredValue } from "react";
import { useNavigate } from "react-router";
import { Search, SlidersHorizontal, Globe, Lock, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { HubCourseCard } from "@/components/hub/HubCourseCard";
import { CategoryIcon } from "@/components/hub/CategoryIcon";
import { useHubCoursesQuery, useMyCoursesQuery } from "@/hooks/useHub";
import { useMode } from "@/hooks/useMode";
import { CATEGORIES } from "@/lib/categories";

type Tab = "public" | "mine";

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

  const [tab, setTab] = useState<Tab>("public");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest" | "title">("newest");
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);

  const deferredSearch = useDeferredValue(search);

  const queryParams = {
    search: deferredSearch || undefined,
    sort,
    category,
    page,
    per_page: PER_PAGE,
  };

  const publicQuery = useHubCoursesQuery(queryParams, tab === "public");
  const myQuery = useMyCoursesQuery(queryParams, tab === "mine");

  const activeQuery = tab === "public" ? publicQuery : myQuery;
  const courses = activeQuery.data?.items ?? [];
  const total = activeQuery.data?.total ?? 0;
  const totalPages = Math.ceil(total / PER_PAGE);
  const isLoading = activeQuery.isLoading;

  const handleTabChange = (newTab: Tab) => {
    setTab(newTab);
    setPage(1);
  };

  const handleCourseClick = (courseId: string) => {
    if (tab === "mine" && mode === "creator") {
      // Creator can go directly to builder for their own courses
      navigate(`${modePrefix}/courses/${courseId}/edit`);
    } else {
      // Learner or public tab - go to hub detail page
      navigate(`${modePrefix}/hub/${courseId}`);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Globe className="text-accent-blue size-6" />
          <h1 className="text-text-primary text-2xl font-semibold">Course Hub</h1>
        </div>
        <p className="text-text-secondary mt-1 text-sm">
          Browse public community courses or manage your own.
        </p>
      </div>

      {/* Tab Toggle */}
      <div className="border-border-default bg-bg-secondary flex items-center gap-1 rounded-lg border p-1">
        <button
          onClick={() => handleTabChange("public")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors sm:flex-initial sm:px-4 ${
            tab === "public"
              ? "bg-bg-primary text-text-primary shadow-sm"
              : "text-text-tertiary hover:text-text-secondary"
          }`}
        >
          <Globe className="size-3.5" />
          <span className="hidden sm:inline">Public </span>Courses
        </button>
        <button
          onClick={() => handleTabChange("mine")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors sm:flex-initial sm:px-4 ${
            tab === "mine"
              ? "bg-bg-primary text-text-primary shadow-sm"
              : "text-text-tertiary hover:text-text-secondary"
          }`}
        >
          <Lock className="size-3.5" />
          <span className="hidden sm:inline">My </span>Courses
        </button>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col gap-3">
        <div className="relative flex-1">
          <Search className="text-text-tertiary absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={tab === "public" ? "Search public courses..." : "Search my courses..."}
            className="pl-9"
            data-testid="hub-search"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto">
          <SlidersHorizontal className="text-text-tertiary size-4 shrink-0" />
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

      {/* Category filter (public tab only) */}
      {tab === "public" && (
        <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => {
              setCategory(undefined);
              setPage(1);
            }}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              !category
                ? "border-accent-blue/20 bg-accent-blue/10 text-accent-blue"
                : "border-border-default bg-bg-tertiary text-text-secondary hover:text-text-primary"
            }`}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => {
                setCategory(cat.slug === category ? undefined : cat.slug);
                setPage(1);
              }}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                category === cat.slug
                  ? "border-accent-blue/20 bg-accent-blue/10 text-accent-blue"
                  : "border-border-default bg-bg-tertiary text-text-secondary hover:text-text-primary"
              }`}
            >
              <CategoryIcon icon={cat.icon} className="size-3.5" />
              <span className="whitespace-nowrap">{cat.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Results count */}
      {!isLoading && (
        <p className="text-text-tertiary text-xs">
          {total} course{total !== 1 ? "s" : ""}{" "}
          {tab === "public" ? "available" : "in your library"}
        </p>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="text-text-tertiary size-6 animate-spin" />
        </div>
      )}

      {/* Course Grid */}
      {!isLoading && courses.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {courses.map((course) => (
            <HubCourseCard
              key={course.id}
              course={course}
              onClick={() => handleCourseClick(course.id)}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && courses.length === 0 && (
        <div className="border-border-default bg-bg-secondary flex h-48 flex-col items-center justify-center gap-2 rounded-xl border">
          {tab === "public" ? (
            <Globe className="text-text-tertiary size-10" />
          ) : (
            <Lock className="text-text-tertiary size-10" />
          )}
          <p className="text-text-secondary text-sm">
            {search
              ? "No courses match your search."
              : tab === "public"
                ? "No public courses available yet."
                : "You haven't created any courses yet."}
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
          <span className="text-text-secondary text-xs">
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
