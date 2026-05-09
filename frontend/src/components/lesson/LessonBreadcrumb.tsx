/**
 * Breadcrumb trail shown above the lesson content.
 *
 * Displays: Course Title › Section Title › Lesson Title
 * Hidden when focus mode is active.
 */
import { ChevronRight } from "lucide-react";

interface LessonBreadcrumbProps {
  courseTitle: string;
  sectionTitle: string | undefined;
  lessonTitle: string;
  onCourseClick: () => void;
}

export function LessonBreadcrumb({
  courseTitle,
  sectionTitle,
  lessonTitle,
  onCourseClick,
}: LessonBreadcrumbProps) {
  return (
    <div className="text-text-tertiary mb-4 flex items-center gap-1.5 text-xs">
      <button onClick={onCourseClick} className="hover:text-text-secondary">
        {courseTitle}
      </button>
      <ChevronRight className="size-3" />
      {sectionTitle && (
        <>
          <span>{sectionTitle}</span>
          <ChevronRight className="size-3" />
        </>
      )}
      <span className="text-text-secondary">{lessonTitle}</span>
    </div>
  );
}
