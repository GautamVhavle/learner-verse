/**
 * Renders the main lesson content area: YouTube embed, markdown
 * notes, reference links, and a fallback for empty lessons.
 *
 * This is a pure presentational component - it receives all data
 * via props and contains no data-fetching logic.
 */
import { useMemo } from "react";
import { Link2 } from "lucide-react";
import { YouTubeEmbed } from "@/components/lesson/YouTubeEmbed";
import { MarkdownRenderer } from "@/components/lesson/MarkdownRenderer";
import { LinkCard } from "@/components/lesson/LinkCard";
import { QuizPlayer } from "@/components/lesson/QuizPlayer";
import { LiviInlineChat } from "@/components/chat/LiviInlineChat";
import { extractVideoId } from "@/lib/youtube";
import type { Lesson } from "@/types/section";

interface LessonContentProps {
  lesson: Lesson;
  onQuizCompleted?: () => void;
  onVideoEnded?: () => void;
  playbackSpeed?: number;
  courseCompleted?: boolean;
}

export function LessonContent({
  lesson,
  onQuizCompleted,
  onVideoEnded,
  playbackSpeed = 1,
  courseCompleted = false,
}: LessonContentProps) {
  const isVideo = (lesson.lesson_type ?? "video") === "video";
  const isNote = (lesson.lesson_type ?? "video") === "note";
  const isQuiz = (lesson.lesson_type ?? "video") === "quiz";
  const videoId = isVideo && lesson.youtube_url ? extractVideoId(lesson.youtube_url) : null;
  const links = lesson.reference_links ?? [];

  const hasContent = videoId || lesson.notes_markdown || links.length > 0 || isQuiz;

  // Stable context objects for inline chat (avoid re-renders)
  const videoContext = useMemo(
    () => ({
      lesson_title: lesson.title,
      youtube_title: lesson.youtube_title ?? "",
      youtube_channel: lesson.youtube_channel ?? "",
    }),
    [lesson.title, lesson.youtube_title, lesson.youtube_channel],
  );

  const readingContext = useMemo(
    () => ({
      lesson_title: lesson.title,
      notes_markdown: lesson.notes_markdown ?? "",
    }),
    [lesson.title, lesson.notes_markdown],
  );

  return (
    <>
      {/* Quiz */}
      {isQuiz && (
        <section>
          <QuizPlayer
            lessonId={lesson.id}
            lessonTitle={lesson.title}
            onQuizCompleted={onQuizCompleted}
            courseCompleted={courseCompleted}
          />
        </section>
      )}

      {/* YouTube */}
      {videoId && (
        <section className="space-y-3">
          <YouTubeEmbed
            videoId={videoId}
            title={lesson.youtube_title ?? undefined}
            playbackSpeed={playbackSpeed}
            onEnded={onVideoEnded}
          />
          <LiviInlineChat contextType="video" contextData={videoContext} />
        </section>
      )}

      {/* Markdown notes */}
      {lesson.notes_markdown && !isVideo && (
        <section className="space-y-3">
          <div className="border-border-default bg-bg-secondary rounded-xl border p-5">
            <MarkdownRenderer content={lesson.notes_markdown} />
          </div>
          {isNote && <LiviInlineChat contextType="reading" contextData={readingContext} />}
        </section>
      )}

      {/* Video lesson notes (below inline chat) */}
      {lesson.notes_markdown && isVideo && (
        <section className="border-border-default bg-bg-secondary rounded-xl border p-5">
          <MarkdownRenderer content={lesson.notes_markdown} />
        </section>
      )}

      {/* Reference links */}
      {links.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-text-primary flex items-center gap-2 text-sm font-medium">
            <Link2 className="text-text-secondary size-4" />
            Reference Links
          </h3>
          <div className="space-y-2">
            {links.map((link) => (
              <LinkCard key={link.id} link={link} readonly />
            ))}
          </div>
        </section>
      )}

      {/* No content fallback */}
      {!hasContent && (
        <div className="border-border-default flex h-40 items-center justify-center rounded-xl border border-dashed">
          <p className="text-text-tertiary text-sm">This lesson has no content yet.</p>
        </div>
      )}
    </>
  );
}
