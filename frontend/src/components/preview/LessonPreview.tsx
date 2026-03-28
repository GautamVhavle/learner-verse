/**
 * Renders a single lesson's content in the course preview.
 *
 * Shows the lesson title, embedded YouTube video, markdown notes,
 * reference links, quiz questions summary, and prev/next navigation buttons.
 */
import { ArrowLeft, ChevronRight, Link2, ClipboardCheck, CheckCircle2, Circle } from "lucide-react";
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
  const isQuiz = (lesson.lesson_type ?? "video") === "quiz";
  const videoId = lesson.youtube_url
    ? extractVideoId(lesson.youtube_url)
    : null;
  const links = lesson.reference_links ?? [];
  const questions = lesson.quiz_questions ?? [];

  const hasContent = videoId || lesson.notes_markdown || links.length > 0 || isQuiz;

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold text-text-primary">
        {lesson.title}
      </h2>

      {/* Quiz preview */}
      {isQuiz && questions.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
            <ClipboardCheck className="size-4 text-purple-500" />
            Quiz — {questions.length} question{questions.length !== 1 ? "s" : ""}
          </div>
          <div className="space-y-3">
            {questions.map((q, idx) => (
              <div key={q.id} className="rounded-lg border border-border-default bg-bg-secondary p-4">
                <p className="text-sm font-medium text-text-primary">
                  <span className="mr-2 text-text-tertiary">Q{idx + 1}.</span>
                  {q.question}
                </p>
                <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {q.options.map((opt, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs ${
                        i === q.correct_option
                          ? "border-accent-green/40 bg-accent-green/10 text-accent-green"
                          : "border-border-default text-text-secondary"
                      }`}
                    >
                      {i === q.correct_option ? (
                        <CheckCircle2 className="size-3.5 shrink-0" />
                      ) : (
                        <Circle className="size-3.5 shrink-0 text-text-tertiary" />
                      )}
                      {opt}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
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
