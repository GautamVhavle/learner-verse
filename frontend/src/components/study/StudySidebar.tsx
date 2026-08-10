/**
 * Study page sidebar with expandable section/lesson navigation tree.
 */
import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Check, Circle, CircleDot } from "lucide-react";
import type { Section } from "@/types/section";

interface StudySidebarProps {
  sections: Section[];
  selectedLessonId: string | null;
  onSelectLesson: (lessonId: string) => void;
  lessonProgress?: Record<string, boolean>;
}

export function StudySidebar({
  sections,
  selectedLessonId,
  onSelectLesson,
  lessonProgress = {},
}: StudySidebarProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Auto-expand section containing selected lesson
  useEffect(() => {
    if (!selectedLessonId) return;
    const section = sections.find((s) => s.lessons.some((l) => l.id === selectedLessonId));
    if (section) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExpanded((prev) => {
        if (prev.has(section.id)) return prev;
        return new Set([...prev, section.id]);
      });
    }
  }, [selectedLessonId, sections]);

  const toggle = (sectionId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  return (
    <div className="space-y-1">
      {sections.map((section) => {
        const isExpanded =
          expanded.has(section.id) || section.lessons.some((l) => l.id === selectedLessonId);

        const sectionCompleted = section.lessons.filter((l) => lessonProgress[l.id]).length;
        const sectionTotal = section.lessons.length;

        return (
          <div key={section.id}>
            <button
              onClick={() => toggle(section.id)}
              className="text-text-primary hover:bg-bg-tertiary flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="text-text-tertiary size-3.5 shrink-0" />
              ) : (
                <ChevronRight className="text-text-tertiary size-3.5 shrink-0" />
              )}
              <span className="min-w-0 flex-1 truncate">{section.title}</span>
              <span className="text-text-tertiary ml-auto text-xs tabular-nums">
                {sectionTotal > 0 ? `${sectionCompleted}/${sectionTotal}` : "0"}
              </span>
            </button>
            {isExpanded && (
              <div className="ml-4 space-y-0.5 pb-1">
                {section.lessons.map((lesson) => {
                  const isCompleted = lessonProgress[lesson.id] ?? false;
                  const isSelected = selectedLessonId === lesson.id;

                  return (
                    <button
                      key={lesson.id}
                      onClick={() => onSelectLesson(lesson.id)}
                      className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ${
                        isSelected
                          ? "bg-accent-blue/10 text-accent-blue"
                          : "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
                      }`}
                    >
                      <LessonStatusIcon completed={isCompleted} selected={isSelected} />
                      <span
                        className={`min-w-0 flex-1 truncate ${isCompleted && !isSelected ? "line-through opacity-60" : ""}`}
                      >
                        {lesson.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function LessonStatusIcon({ completed, selected }: { completed: boolean; selected: boolean }) {
  if (completed) {
    return <Check className="text-accent-green size-3 shrink-0" />;
  }
  if (selected) {
    return <CircleDot className="text-accent-blue size-3 shrink-0" />;
  }
  return <Circle className="text-text-tertiary size-3 shrink-0" />;
}
