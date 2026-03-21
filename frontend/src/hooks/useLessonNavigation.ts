/**
 * Hook that derives navigation state from the flat lesson list.
 *
 * Given the full sections array and the current lessonId, computes
 * the current lesson, previous/next lessons, and the parent section.
 */
import { useMemo } from "react";
import type { Section, Lesson } from "@/types/section";

interface LessonNavigation {
  /** All lessons flattened across every section, in order. */
  allLessons: Lesson[];
  /** The currently viewed lesson, or null if not found. */
  currentLesson: Lesson | null;
  /** The section that contains the current lesson. */
  currentSection: Section | null;
  /** The lesson before the current one, or null if first. */
  prevLesson: Lesson | null;
  /** The lesson after the current one, or null if last. */
  nextLesson: Lesson | null;
}

export function useLessonNavigation(
  sections: Section[] | undefined,
  lessonId: string | undefined,
): LessonNavigation {
  return useMemo(() => {
    const allLessons = sections?.flatMap((s) => s.lessons) ?? [];
    const currentLesson = allLessons.find((l) => l.id === lessonId) ?? null;
    const currentIndex = currentLesson
      ? allLessons.findIndex((l) => l.id === currentLesson.id)
      : -1;

    return {
      allLessons,
      currentLesson,
      currentSection: currentLesson
        ? sections?.find((s) => s.lessons.some((l) => l.id === currentLesson.id)) ?? null
        : null,
      prevLesson: currentIndex > 0 ? allLessons[currentIndex - 1] : null,
      nextLesson:
        currentIndex >= 0 && currentIndex < allLessons.length - 1
          ? allLessons[currentIndex + 1]
          : null,
    };
  }, [sections, lessonId]);
}
