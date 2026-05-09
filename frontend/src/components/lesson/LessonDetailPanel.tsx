/**
 * Side panel for editing lesson content: YouTube video, markdown notes, and reference links.
 *
 * A lesson is either "video" (YouTube + notes + links) or "note" (notes + links only).
 * The type toggle at the top controls which sections are visible.
 */
import { useState, useCallback } from "react";
import { ArrowLeft, Video, FileText, Link2, StickyNote, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { YouTubeInput } from "@/components/lesson/YouTubeInput";
import { YouTubeEmbed } from "@/components/lesson/YouTubeEmbed";
import { MarkdownEditor } from "@/components/lesson/MarkdownEditor";
import { LinkCard } from "@/components/lesson/LinkCard";
import { LinkInput } from "@/components/lesson/LinkInput";
import { QuizEditor } from "@/components/lesson/QuizEditor";
import { extractVideoId } from "@/lib/youtube";
import type { Lesson, LessonUpdate, ReferenceLinkCreate, LessonType } from "@/types/section";

const MAX_REFERENCE_LINKS = 20;

interface LessonDetailPanelProps {
  lesson: Lesson;
  courseId: string;
  onUpdate: (data: LessonUpdate) => void;
  onAddReferenceLink: (data: ReferenceLinkCreate) => void;
  onDeleteReferenceLink: (linkId: string) => void;
  onClose: () => void;
}

export function LessonDetailPanel({
  lesson,
  courseId,
  onUpdate,
  onAddReferenceLink,
  onDeleteReferenceLink,
  onClose,
}: LessonDetailPanelProps) {
  const lessonType: LessonType = lesson.lesson_type ?? "video";
  const isVideo = lessonType === "video";
  const isQuiz = lessonType === "quiz";

  const videoId = lesson.youtube_url ? extractVideoId(lesson.youtube_url) : null;

  const [markdown, setMarkdown] = useState(lesson.notes_markdown ?? "");

  const handleMarkdownBlur = useCallback(() => {
    // Only send update if value changed
    if (markdown !== (lesson.notes_markdown ?? "")) {
      onUpdate({ notes_markdown: markdown || null });
    }
  }, [markdown, lesson.notes_markdown, onUpdate]);

  const handleTypeChange = (type: LessonType) => {
    if (type === lessonType) return;
    onUpdate({ lesson_type: type });
  };

  const links = lesson.reference_links ?? [];
  const atLinkLimit = links.length >= MAX_REFERENCE_LINKS;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="text-text-primary truncate text-base font-semibold">{lesson.title}</h2>
          <p className="text-text-secondary text-xs">Lesson content</p>
        </div>
      </div>

      {/* ── Lesson Type Toggle ────────────────────────────────── */}
      <div
        className="border-border-default bg-bg-secondary flex gap-1 rounded-lg border p-1"
        role="radiogroup"
        aria-label="Lesson type"
      >
        {[
          { type: "video" as LessonType, icon: Video, label: "Video" },
          { type: "note" as LessonType, icon: StickyNote, label: "Reading" },
          { type: "quiz" as LessonType, icon: ClipboardCheck, label: "Quiz" },
        ].map(({ type, icon: Icon, label }) => (
          <button
            key={type}
            role="radio"
            aria-checked={lessonType === type}
            onClick={() => handleTypeChange(type)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              lessonType === type
                ? "bg-bg-primary text-text-primary shadow-sm"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Quiz Editor (quiz type only) ────────────────────── */}
      {isQuiz && <QuizEditor lessonId={lesson.id} courseId={courseId} />}

      {/* ── YouTube Video Section (video type only) ───────────── */}
      {isVideo && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Video className="text-text-secondary size-4" />
            <h3 className="text-text-primary text-sm font-medium">YouTube Video</h3>
          </div>

          {videoId && <YouTubeEmbed videoId={videoId} title={lesson.youtube_title ?? undefined} />}

          <YouTubeInput
            currentUrl={lesson.youtube_url}
            currentTitle={lesson.youtube_title}
            currentThumbnail={lesson.youtube_thumbnail}
            currentChannel={lesson.youtube_channel}
            currentDuration={lesson.youtube_duration}
            onSave={(data) => onUpdate(data)}
          />
        </section>
      )}

      {/* ── Markdown Notes Section (video & note types) ───────── */}
      {!isQuiz && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="text-text-secondary size-4" />
            <h3 className="text-text-primary text-sm font-medium">Notes</h3>
          </div>

          <MarkdownEditor value={markdown} onChange={setMarkdown} onBlur={handleMarkdownBlur} />
        </section>
      )}

      {/* ── Reference Links Section (video & note types) ──────── */}
      {!isQuiz && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link2 className="text-text-secondary size-4" />
              <h3 className="text-text-primary text-sm font-medium">Reference Links</h3>
            </div>
            {links.length > 0 && (
              <span className="text-text-tertiary text-xs tabular-nums">
                {links.length} / {MAX_REFERENCE_LINKS}
              </span>
            )}
          </div>

          {/* Existing links */}
          {links.length > 0 && (
            <div className="space-y-2">
              {links.map((link) => (
                <LinkCard
                  key={link.id}
                  link={link}
                  onRemove={() => onDeleteReferenceLink(link.id)}
                />
              ))}
            </div>
          )}

          {/* Add new link */}
          {!atLinkLimit && <LinkInput onAdd={onAddReferenceLink} />}

          {atLinkLimit && (
            <p className="text-text-tertiary text-xs">
              Maximum of {MAX_REFERENCE_LINKS} reference links reached.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
