/**
 * Small icon indicator shown next to each lesson title in the preview sidebar.
 *
 * Shows a video, note, or quiz icon based on `lesson_type`, with secondary
 * indicators for content presence.
 */
import { Video, StickyNote, ClipboardCheck } from "lucide-react";
import type { Lesson } from "@/types/section";

interface ContentIndicatorProps {
  lesson: Lesson;
}

export function ContentIndicator({ lesson }: ContentIndicatorProps) {
  const type = lesson.lesson_type ?? "video";

  if (type === "quiz") {
    return (
      <ClipboardCheck
        className={`size-3 shrink-0 ${
          (lesson.quiz_questions?.length ?? 0) > 0 ? "text-purple-500" : "text-text-tertiary"
        }`}
      />
    );
  }

  if (type === "note") {
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
