/**
 * Course preview page — lets creators see their course as a learner would.
 *
 * Renders a sidebar with expandable sections, a lesson content area,
 * and an overview placeholder when no lesson is selected.
 */
import { useState } from "react";
import { useParams } from "react-router";
import { useModeAwareNavigate } from "@/hooks/useModeAwareNavigate";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CourseStatusBadge } from "@/components/course/CourseStatusBadge";
import { ContentIndicator } from "@/components/preview/ContentIndicator";
import { CourseOverview } from "@/components/preview/CourseOverview";
import { LessonPreview } from "@/components/preview/LessonPreview";
import { useCourseQuery } from "@/hooks/useCourses";
import { useSectionsQuery } from "@/hooks/useSections";

export default function CoursePreviewPage() {
  const { id: courseId } = useParams<{ id: string }>();
  const navigate = useModeAwareNavigate();

  const { data: course, isLoading: courseLoading } = useCourseQuery(courseId);
  const { data: sections, isLoading: sectionsLoading } =
    useSectionsQuery(courseId);

  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  );

  const isLoading = courseLoading || sectionsLoading;

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-text-tertiary" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-sm text-text-secondary">Course not found.</p>
        <Button variant="outline" onClick={() => navigate("/")}>
          <ArrowLeft className="size-4" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const allLessons = sections?.flatMap((s) => s.lessons) ?? [];
  const selectedLesson = selectedLessonId
    ? allLessons.find((l) => l.id === selectedLessonId) ?? null
    : null;

  const currentIndex = selectedLesson
    ? allLessons.findIndex((l) => l.id === selectedLesson.id)
    : -1;
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex >= 0 && currentIndex < allLessons.length - 1
      ? allLessons[currentIndex + 1]
      : null;

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  // Find which section a lesson belongs to (for breadcrumb)
  const currentSection = selectedLesson
    ? sections?.find((s) =>
        s.lessons.some((l) => l.id === selectedLesson.id)
      )
    : null;

  return (
    <div className="mx-auto max-w-5xl">
      {/* Top bar */}
      <div className="mb-6 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/courses/${courseId}/edit`)}
          className="shrink-0"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-lg font-semibold text-text-primary">
              {course.title}
            </h1>
            <CourseStatusBadge status={course.status} />
            <span className="rounded-full bg-accent-purple/15 px-2 py-0.5 text-[10px] font-medium text-accent-purple">
              Preview
            </span>
          </div>
          {/* Breadcrumb when viewing a lesson */}
          {currentSection && selectedLesson && (
            <p className="mt-0.5 text-xs text-text-tertiary">
              <button
                className="hover:text-text-secondary"
                onClick={() => setSelectedLessonId(null)}
              >
                {course.title}
              </button>
              {" › "}
              <span>{currentSection.title}</span>
              {" › "}
              <span className="text-text-secondary">
                {selectedLesson.title}
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Sidebar — section/lesson tree */}
        <aside className="w-full shrink-0 lg:w-64">
          <div className="sticky top-4 space-y-1 rounded-xl border border-border-default bg-bg-secondary p-2">
            {sections?.map((section) => {
              const isExpanded =
                expandedSections.has(section.id) ||
                section.lessons.some((l) => l.id === selectedLessonId);
              return (
                <div key={section.id}>
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary"
                  >
                    {isExpanded ? (
                      <ChevronDown className="size-3.5 shrink-0 text-text-tertiary" />
                    ) : (
                      <ChevronRight className="size-3.5 shrink-0 text-text-tertiary" />
                    )}
                    <span className="truncate">{section.title}</span>
                    <span className="ml-auto text-xs tabular-nums text-text-tertiary">
                      {section.lessons.length}
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="ml-4 space-y-0.5 pb-1">
                      {section.lessons.map((lesson) => (
                        <button
                          key={lesson.id}
                          onClick={() => setSelectedLessonId(lesson.id)}
                          className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ${
                            selectedLessonId === lesson.id
                              ? "bg-accent-blue/10 text-accent-blue"
                              : "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
                          }`}
                        >
                          <ContentIndicator lesson={lesson} />
                          <span className="truncate">{lesson.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* Content area */}
        <main className="min-w-0 flex-1">
          {selectedLesson ? (
            <LessonPreview
              lesson={selectedLesson}
              prevLesson={prevLesson}
              nextLesson={nextLesson}
              onNavigate={setSelectedLessonId}
            />
          ) : (
            <CourseOverview
              description={course.description}
              sectionCount={course.section_count}
              lessonCount={course.lesson_count}
              onStartLesson={() => {
                if (allLessons.length > 0) {
                  setSelectedLessonId(allLessons[0].id);
                  // Auto-expand first section
                  if (sections?.[0]) {
                    setExpandedSections(new Set([sections[0].id]));
                  }
                }
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}
