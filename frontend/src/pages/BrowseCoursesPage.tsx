/**
 * Browse Courses page — catalog of all published courses.
 *
 * Shows every ready course with an "Enroll" / "Enrolled" action.
 * Enrolling a course adds it to the learner dashboard; unenrolling removes it.
 */
import { useState } from "react";
import { useModeAwareNavigate } from "@/hooks/useModeAwareNavigate";
import { Compass, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/EmptyState";
import { BrowseCourseCard } from "@/components/dashboard/BrowseCourseCard";
import { useCoursesQuery } from "@/hooks/useCourses";
import {
  useEnrolledCoursesQuery,
  useEnrollMutation,
  useUnenrollMutation,
} from "@/hooks/useEnrollments";

export default function BrowseCoursesPage() {
  const navigate = useModeAwareNavigate();
  const [search, setSearch] = useState("");

  const { data: allCoursesData, isLoading } = useCoursesQuery({ status: "ready" });
  const { data: enrolledData } = useEnrolledCoursesQuery();
  const enrollMutation = useEnrollMutation();
  const unenrollMutation = useUnenrollMutation();

  const allCourses = allCoursesData?.items ?? [];
  const enrolledIds = new Set((enrolledData?.items ?? []).map((c) => c.id));

  const filtered = search.trim()
    ? allCourses.filter(
        (c) =>
          c.title.toLowerCase().includes(search.toLowerCase()) ||
          c.description?.toLowerCase().includes(search.toLowerCase()),
      )
    : allCourses;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-text-primary text-2xl font-bold tracking-tight">Browse Courses</h1>
        <p className="text-text-secondary mt-1 text-sm">
          Discover and enroll in courses to add them to your learning dashboard.
        </p>
      </div>

      {/* Search */}
      {allCourses.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="text-text-tertiary absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            className="pl-9"
            placeholder="Search courses…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* Summary badge */}
      {enrolledIds.size > 0 && (
        <p className="text-text-tertiary text-xs">
          You are enrolled in{" "}
          <span className="text-text-primary font-medium">{enrolledIds.size}</span>{" "}
          {enrolledIds.size === 1 ? "course" : "courses"}.
        </p>
      )}

      {/* Empty state — no published courses */}
      {!isLoading && allCourses.length === 0 && (
        <EmptyState
          icon={
            <div className="bg-accent-blue/10 flex size-14 items-center justify-center rounded-full">
              <Compass className="text-accent-blue/50 size-7" />
            </div>
          }
          title="No courses published yet"
          description="Switch to Creator mode to create courses, mark them as ready, and they'll appear here."
        />
      )}

      {/* Empty filtered results */}
      {!isLoading && allCourses.length > 0 && filtered.length === 0 && (
        <p className="text-text-tertiary text-sm">No courses match your search.</p>
      )}

      {/* Course grid */}
      {filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course) => (
            <BrowseCourseCard
              key={course.id}
              course={course}
              isEnrolled={enrolledIds.has(course.id)}
              isPending={
                (enrollMutation.isPending && enrollMutation.variables === course.id) ||
                (unenrollMutation.isPending && unenrollMutation.variables === course.id)
              }
              onEnroll={() => enrollMutation.mutate(course.id)}
              onUnenroll={() => unenrollMutation.mutate(course.id)}
              onStudy={() => navigate(`/study/${course.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
