/**
 * Study page sidebar with expandable section/lesson navigation tree.
 */
import { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronRight,
  Video,
  FileText,
  Link2,
  Check,
  Circle,
  CircleDot,
} from "lucide-react";
import type { Section, Lesson } from "@/types/section";

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
    const section = sections.find((s) =>
      s.lessons.some((l) => l.id === selectedLessonId)
    );
    if (section && !expanded.has(section.id)) {
      setExpanded((prev) => new Set([...prev, section.id]));
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
          expanded.has(section.id) ||
          section.lessons.some((l) => l.id === selectedLessonId);

        const sectionCompleted = section.lessons.filter(
          (l) => lessonProgress[l.id]
        ).length;
        const sectionTotal = section.lessons.length;

        return (
          <div key={section.id}>
            <button
              onClick={() => toggle(section.id)}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary"
            >
              {isExpanded ? (
                <ChevronDown className="size-3.5 shrink-0 text-text-tertiary" />
              ) : (
                <ChevronRight className="size-3.5 shrink-0 text-text-tertiary" />
              )}
              <span className="min-w-0 flex-1 truncate">{section.title}</span>
              <span className="ml-auto text-xs tabular-nums text-text-tertiary">
                {sectionTotal > 0
                  ? `${sectionCompleted}/${sectionTotal}`
                  : "0"}
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
                      <LessonStatusIcon
                        completed={isCompleted}
                        selected={isSelected}
                      />
                      <span className={`min-w-0 flex-1 truncate ${isCompleted && !isSelected ? "line-through opacity-60" : ""}`}>
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

function LessonStatusIcon({
  completed,
  selected,
}: {
  completed: boolean;
  selected: boolean;
}) {
  if (completed) {
    return (
      <Check className="size-3 shrink-0 text-accent-green" />
    );
  }
  if (selected) {
    return (
      <CircleDot className="size-3 shrink-0 text-accent-blue" />
    );
  }
  return (
    <Circle className="size-3 shrink-0 text-text-tertiary" />
  );
}
