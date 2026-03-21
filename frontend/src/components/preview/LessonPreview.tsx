/**
 * Renders a single lesson's content in the course preview.
 *
 * Shows the lesson title, embedded YouTube video, markdown notes,
 * reference links, and prev/next navigation buttons.
 */
import { ArrowLeft, ChevronRight, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { YouTubeEmbed } from "@/components/lesson/YouTubeEmbed";
import { MarkdownRenderer } from "@/components/lesson/MarkdownRenderer";
import { LinkCard } from "@/components/lesson/LinkCard";
import { extractVideoId } from "@/lib/youtube";
import type { Lesson } from "@/types/section";

interface LessonPreviewProps {
  lesson: Lesson;
  prevLesson: Lesson | null;
  nextLesson: Lesson | null;
  onNavigate: (id: string) => void;
}

export function LessonPreview({
  lesson,
  prevLesson,
  nextLesson,
  onNavigate,
}: LessonPreviewProps) {
  const videoId = lesson.youtube_url
    ? extractVideoId(lesson.youtube_url)
    : null;
  const links = lesson.reference_links ?? [];

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold text-text-primary">
        {lesson.title}
      </h2>

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
      {!videoId && !lesson.notes_markdown && links.length === 0 && (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border-default">
          <p className="text-sm text-text-tertiary">
            This lesson has no content yet.
          </p>
        </div>
      )}

      {/* Prev / Next nav */}
      <div className="flex items-center justify-between border-t border-border-default pt-4">
        {prevLesson ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate(prevLesson.id)}
            className="gap-1.5 text-text-secondary"
          >
            <ArrowLeft className="size-3.5" />
            {prevLesson.title}
          </Button>
        ) : (
          <div />
        )}
        {nextLesson && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate(nextLesson.id)}
            className="gap-1.5 text-text-secondary"
          >
            {nextLesson.title}
            <ChevronRight className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
