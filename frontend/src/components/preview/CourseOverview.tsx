/**
 * Empty-state overview card shown when no lesson is selected in course preview.
 *
 * Displays the course description, section/lesson counts, and a
 * "Start from Beginning" button.
 */
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CourseOverviewProps {
  description: string | null;
  sectionCount: number;
  lessonCount: number;
  onStartLesson: () => void;
}

export function CourseOverview({
  description,
  sectionCount,
  lessonCount,
  onStartLesson,
}: CourseOverviewProps) {
  return (
    <div className="border-border-default bg-bg-secondary flex flex-col items-center justify-center rounded-xl border p-8 text-center">
      <BookOpen className="text-text-tertiary mb-4 size-10" />
      <h2 className="text-text-primary text-lg font-semibold">Course Preview</h2>
      {description && <p className="text-text-secondary mt-2 max-w-md text-sm">{description}</p>}
      <p className="text-text-tertiary mt-3 text-xs">
        {sectionCount} sections &middot; {lessonCount} lessons
      </p>
      {lessonCount > 0 && (
        <Button onClick={onStartLesson} className="mt-5 gap-2">
          <BookOpen className="size-4" />
          Start from Beginning
        </Button>
      )}
    </div>
  );
}
