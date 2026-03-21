/**
 * Filterable grid layout of course cards with search and status filtering.
 */
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CourseCard } from "@/components/course/CourseCard";
import type { Course } from "@/types/course";

interface CourseGridProps {
  courses: Course[];
  isLoading?: boolean;
  onEdit: (course: Course) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  duplicatingId?: string | null;
  statusFilter: string | null;
  onStatusFilterChange: (status: string | null) => void;
  search: string;
  onSearchChange: (search: string) => void;
}

const STATUS_FILTERS = [
  { label: "All", value: null },
  { label: "Draft", value: "draft" },
  { label: "Ready", value: "ready" },
] as const;

export function CourseGrid({
  courses,
  isLoading,
  onEdit,
  onDelete,
  onDuplicate,
  duplicatingId,
  statusFilter,
  onStatusFilterChange,
  search,
  onSearchChange,
}: CourseGridProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1">
          {STATUS_FILTERS.map((f) => (
            <Button
              key={f.label}
              variant={statusFilter === f.value ? "secondary" : "ghost"}
              size="sm"
              onClick={() => onStatusFilterChange(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-tertiary" />
          <Input
            placeholder="Search courses…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[4/3] animate-pulse rounded-xl bg-bg-tertiary"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onEdit={onEdit}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              isDuplicating={duplicatingId === course.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
