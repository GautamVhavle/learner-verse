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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setContent(note?.content ?? "");
  }, [note?.content, lessonId]);

  const handleSave = useCallback(
    async (data: string) => {
      await updateNote.mutateAsync({
        lessonId,
        data: { content: data || null },
      });
    },
    [lessonId, updateNote],
  );

  const { status } = useAutoSave({
    data: content,
    onSave: handleSave,
    debounceMs: 5000,
    enabled: open,
  });

  return (
    <div className="border-border-default bg-bg-secondary rounded-xl border">
      <button
        onClick={() => setOpen(!open)}
        className="text-text-primary hover:bg-bg-tertiary flex w-full items-center gap-2 rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors"
      >
        {open ? (
          <ChevronDown className="text-text-tertiary size-4" />
        ) : (
          <ChevronRight className="text-text-tertiary size-4" />
        )}
        <StickyNote className="text-accent-amber size-4" />
        <span>My Notes</span>
        <span className="ml-auto">
          <SaveIndicator status={status} />
        </span>
      </button>
      {open && (
        <div className="border-border-default border-t px-4 py-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your personal study notes here… (Markdown supported)"
            className="border-border-default bg-bg-primary text-text-primary placeholder:text-text-tertiary focus:border-accent-blue min-h-[120px] w-full resize-y rounded-lg border px-3 py-2 text-sm focus:outline-none"
          />
          <p className="text-text-tertiary mt-1.5 text-[10px]">
            Notes auto-save as you type. Only visible to you.
          </p>
        </div>
      )}
    </div>
  );
}
