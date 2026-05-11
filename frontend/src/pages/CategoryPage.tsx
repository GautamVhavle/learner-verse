/**
 * Dedicated category page — lists all public courses in a specific category.
 */
import { useState, useDeferredValue } from "react";
import { useParams, useNavigate } from "react-router";
import { Search, ArrowLeft, Loader2, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { HubCourseCard } from "@/components/hub/HubCourseCard";
import { CategoryIcon } from "@/components/hub/CategoryIcon";
import { useHubCoursesQuery } from "@/hooks/useHub";
import { useMode } from "@/hooks/useMode";
import { CATEGORY_MAP } from "@/lib/categories";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "title", label: "A–Z" },
] as const;

const PER_PAGE = 20;

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { mode } = useMode();
  const modePrefix = mode === "creator" ? "/creator" : "/learner";

  const category = slug ? CATEGORY_MAP.get(slug) : undefined;

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest" | "title">("newest");
  const [page, setPage] = useState(1);
  const deferredSearch = useDeferredValue(search);

  const { data, isLoading } = useHubCoursesQuery({
    search: deferredSearch || undefined,
    category: slug,
    sort,
    page,
    per_page: PER_PAGE,
  });

  const courses = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PER_PAGE);

  const handleCourseClick = (courseId: string) => {
    navigate(`${modePrefix}/hub/${courseId}`);
  };

  if (!category) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="border-border-default bg-bg-secondary flex h-48 flex-col items-center justify-center gap-3 rounded-xl border">
          <p className="text-text-secondary text-sm">Category not found.</p>
          <Button variant="outline" size="sm" onClick={() => navigate(`${modePrefix}/hub`)}>
            Back to Course Hub
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate(`${modePrefix}/hub`)}
          className="text-text-secondary hover:text-text-primary mb-3 flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to Course Hub
        </button>
        <div className="flex items-center gap-3">
          <div className="bg-accent-blue/10 flex size-10 items-center justify-center rounded-xl">
            <CategoryIcon icon={category.icon} className="text-accent-blue size-5" />
          </div>
          <div>
            <h1 className="text-text-primary text-2xl font-semibold">{category.name}</h1>
            <p className="text-text-secondary text-sm">
              {total} course{total !== 1 ? "s" : ""} available
            </p>
          </div>
        </div>
      </div>

      {/* Search + Sort */}
      <div className="flex flex-col gap-3">
        <div className="relative flex-1">
          <Search className="text-text-tertiary absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={`Search ${category.name} courses...`}
            className="pl-9"
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
        <div className="border-border-default bg-bg-secondary flex h-48 flex-col items-center justify-center gap-3 rounded-xl border">
          <div className="bg-bg-tertiary flex size-12 items-center justify-center rounded-full">
            <CategoryIcon icon={category.icon} className="text-text-tertiary size-6" />
          </div>
          <p className="text-text-secondary text-sm font-medium">Coming Soon</p>
          <p className="text-text-tertiary text-xs">
            {search
              ? "No courses match your search."
              : `No courses in ${category.name} yet. Check back later!`}
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
