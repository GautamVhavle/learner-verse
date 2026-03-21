/**
 * Collapsible per-lesson study notes editor with auto-save.
 */
import { useState, useEffect, useCallback } from "react";
import { ChevronDown, ChevronRight, StickyNote } from "lucide-react";
import { SaveIndicator } from "@/components/shared/SaveIndicator";
import { useStudyNoteQuery, useUpdateStudyNoteMutation } from "@/hooks/useStudy";
import { useAutoSave } from "@/hooks/useAutoSave";

interface StudyNotesProps {
  lessonId: string;
}

export function StudyNotes({ lessonId }: StudyNotesProps) {
  const { data: note } = useStudyNoteQuery(lessonId);
  const updateNote = useUpdateStudyNoteMutation();
  const [content, setContent] = useState("");
  const [open, setOpen] = useState(false);

  // Sync from server when lesson changes
  useEffect(() => {
    setContent(note?.content ?? "");
  }, [note?.content, lessonId]);

  const handleSave = useCallback(
    async (data: string) => {
      await updateNote.mutateAsync({
        lessonId,
        data: { content: data || null },
      });
    },
    [lessonId, updateNote]
  );

  const { status } = useAutoSave({
    data: content,
    onSave: handleSave,
    debounceMs: 1500,
    enabled: open,
  });

  return (
    <div className="rounded-xl border border-border-default bg-bg-secondary">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary rounded-xl"
      >
        {open ? (
          <ChevronDown className="size-4 text-text-tertiary" />
        ) : (
          <ChevronRight className="size-4 text-text-tertiary" />
        )}
        <StickyNote className="size-4 text-accent-amber" />
        <span>My Notes</span>
        <span className="ml-auto">
          <SaveIndicator status={status} />
        </span>
      </button>
      {open && (
        <div className="border-t border-border-default px-4 py-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your personal study notes here… (Markdown supported)"
            className="min-h-[120px] w-full resize-y rounded-lg border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-blue focus:outline-none"
          />
          <p className="mt-1.5 text-[10px] text-text-tertiary">
            Notes auto-save as you type. Only visible to you.
          </p>
        </div>
      )}
    </div>
  );
}
