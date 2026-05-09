/**
 * Renders the list of section cards on the study page.
 *
 * Each card shows a numbered section title and a completion indicator
 * sourced from the course progress data.
 */
import { SectionProgress } from "@/components/study/SectionProgress";
import type { Section } from "@/types/section";
import type { CourseProgressResponse } from "@/types/progress";

interface StudySectionListProps {
  sections: Section[];
  progress: CourseProgressResponse | undefined;
}

export function StudySectionList({ sections, progress }: StudySectionListProps) {
  if (sections.length === 0) return null;

  return (
    <div className="mt-6 space-y-3">
      <h2 className="text-text-primary text-sm font-medium">Course Content</h2>
      {sections.map((section, idx) => {
        const sp = progress?.sections.find((s) => s.section_id === section.id);
        return (
          <div
            key={section.id}
            className="border-border-default bg-bg-secondary rounded-lg border px-4 py-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="bg-bg-tertiary text-text-tertiary flex size-6 items-center justify-center rounded-md text-xs font-medium">
                  {idx + 1}
                </span>
                <span className="text-text-primary text-sm font-medium">{section.title}</span>
              </div>
              <SectionProgress
                completed={sp?.completed_lessons ?? 0}
                total={sp?.total_lessons ?? section.lessons.length}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
