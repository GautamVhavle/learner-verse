/**
 * Small icon indicator shown next to each lesson title in the preview sidebar.
 *
 * Shows a video or note icon based on `lesson_type`, with secondary
 * indicators for content presence.
 */
import { Video, StickyNote } from "lucide-react";
import type { Lesson } from "@/types/section";

interface ContentIndicatorProps {
  lesson: Lesson;
}

export function ContentIndicator({ lesson }: ContentIndicatorProps) {
  const isNote = (lesson.lesson_type ?? "video") === "note";

  if (isNote) {
    return (
      <StickyNote
        className={`size-3 shrink-0 ${
          lesson.notes_markdown ? "text-amber-500" : "text-text-tertiary"
        }`}
      />
    );
  }

  return (
    <Video
      className={`size-3 shrink-0 ${
        lesson.youtube_url ? "text-accent-blue" : "text-text-tertiary"
      }`}
    />
  );
}
