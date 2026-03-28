/**
 * Renders the main lesson content area: YouTube embed, markdown
 * notes, reference links, and a fallback for empty lessons.
 *
 * This is a pure presentational component — it receives all data
 * via props and contains no data-fetching logic.
 */
import { Link2 } from "lucide-react";
import { YouTubeEmbed } from "@/components/lesson/YouTubeEmbed";
import { MarkdownRenderer } from "@/components/lesson/MarkdownRenderer";
import { LinkCard } from "@/components/lesson/LinkCard";
import { QuizPlayer } from "@/components/lesson/QuizPlayer";
import { extractVideoId } from "@/lib/youtube";
import type { Lesson } from "@/types/section";

interface LessonContentProps {
  lesson: Lesson;
  onQuizCompleted?: () => void;
}

export function LessonContent({ lesson, onQuizCompleted }: LessonContentProps) {
  const isVideo = (lesson.lesson_type ?? "video") === "video";
  const isQuiz = (lesson.lesson_type ?? "video") === "quiz";
  const videoId =
    isVideo && lesson.youtube_url
      ? extractVideoId(lesson.youtube_url)
      : null;
  const links = lesson.reference_links ?? [];

  const hasContent = videoId || lesson.notes_markdown || links.length > 0 || isQuiz;

  return (
    <>
      {/* Quiz */}
      {isQuiz && (
        <section>
          <QuizPlayer lessonId={lesson.id} onQuizCompleted={onQuizCompleted} />
        </section>
      )}

      {/* YouTube */}
      {videoId && (
        <section>
          <YouTubeEmbed
            videoId={videoId}
            title={lesson.youtube_title ?? undefined}
          />
        </section>
      )}

      {/* Markdown notes */}
      {lesson.notes_markdown && (
        <section className="rounded-xl border border-border-default bg-bg-secondary p-5">
          <MarkdownRenderer content={lesson.notes_markdown} />
        </section>
      )}

      {/* Reference links */}
      {links.length > 0 && (
        <section className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-medium text-text-primary">
            <Link2 className="size-4 text-text-secondary" />
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
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border-default">
          <p className="text-sm text-text-tertiary">
            This lesson has no content yet.
          </p>
        </div>
      )}
    </>
  );
}
