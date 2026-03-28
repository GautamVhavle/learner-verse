/**
 * Draggable lesson row with inline editing and context menu actions.
 */
import { useState, useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  MoreHorizontal,
  Copy,
  Trash2,
  Pencil,
  Video,
  StickyNote,
  ClipboardCheck,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Lesson } from "@/types/section";

interface LessonItemProps {
  lesson: Lesson;
  onUpdate: (title: string) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onClick?: () => void;
}

export function LessonItem({
  lesson,
  onUpdate,
  onDelete,
  onDuplicate,
  onClick,
}: LessonItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(lesson.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  const handleSave = () => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== lesson.title) {
      onUpdate(trimmed);
    } else {
      setEditTitle(lesson.title);
    }
    setIsEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group/lesson flex items-center gap-2 rounded-lg border border-border-default bg-bg-primary px-3 py-2 transition-colors hover:border-border-hover cursor-pointer ${isDragging ? "z-50 opacity-50 shadow-lg" : ""}`}
      onClick={onClick}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-text-tertiary hover:text-text-secondary"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="size-4" />
      </button>

      {/* Lesson type icon */}
      {(lesson.lesson_type ?? "video") === "video" ? (
        <Video className={`size-4 shrink-0 ${lesson.youtube_url ? "text-accent-blue" : "text-text-tertiary"}`} />
      ) : (lesson.lesson_type ?? "video") === "quiz" ? (
        <ClipboardCheck className="size-4 shrink-0 text-purple-500" />
      ) : (
        <StickyNote className="size-4 shrink-0 text-amber-500" />
      )}

      {/* Title */}
      {isEditing ? (
        <div className="flex-1" onClick={(e) => e.stopPropagation()}>
          <Input
            ref={inputRef}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") {
                setEditTitle(lesson.title);
                setIsEditing(false);
              }
            }}
            className="h-6 w-full border-none bg-transparent px-1 text-sm focus-visible:ring-0"
          />
        </div>
      ) : (
        <span
          className="flex-1 truncate text-sm text-text-primary cursor-pointer"
          onDoubleClick={() => setIsEditing(true)}
        >
          {lesson.title}
        </span>
      )}

      {/* Type badge */}
      {(lesson.lesson_type ?? "video") === "video" && lesson.youtube_duration && (
        <span className="shrink-0 rounded bg-bg-tertiary px-1.5 py-0.5 text-[10px] text-text-secondary">
          {lesson.youtube_duration}
        </span>
      )}
      {(lesson.lesson_type ?? "video") === "note" && (
        <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          Reading Lesson
        </span>
      )}
      {(lesson.lesson_type ?? "video") === "quiz" && (
        <span className="shrink-0 rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
          Quiz · {lesson.quiz_questions?.length ?? 0} Q
        </span>
      )}

      {/* Actions */}
      <div onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              className="shrink-0 opacity-0 group-hover/lesson:opacity-100 transition-opacity"
            />
          }
        >
          <MoreHorizontal className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={4}>
          <DropdownMenuItem onClick={() => setIsEditing(true)}>
            <Pencil className="size-4" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDuplicate}>
            <Copy className="size-4" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            <Trash2 className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
