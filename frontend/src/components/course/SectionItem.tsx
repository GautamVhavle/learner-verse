/**
 * Collapsible, draggable section panel containing a sortable list of lessons.
 */
import { useState, useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  ChevronDown,
  GripVertical,
  MoreHorizontal,
  Plus,
  Copy,
  Trash2,
  Pencil,
  Video,
  StickyNote,
  ClipboardCheck,
  ListVideo,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LessonItem } from "@/components/course/LessonItem";
import { ImportPlaylistDialog } from "@/components/course/ImportPlaylistDialog";
import type { Section, ReorderItem, LessonType } from "@/types/section";

interface SectionItemProps {
  section: Section;
  courseId: string;
  onUpdateSection: (title: string) => void;
  onDeleteSection: () => void;
  onDuplicateSection: () => void;
  onAddLesson: (type: LessonType) => void;
  onUpdateLesson: (lessonId: string, title: string) => void;
  onDeleteLesson: (lessonId: string) => void;
  onDuplicateLesson: (lessonId: string) => void;
  onReorderLessons: (items: ReorderItem[]) => void;
  onLessonClick?: (lessonId: string) => void;
}

export function SectionItem({
  section,
  courseId,
  onUpdateSection,
  onDeleteSection,
  onDuplicateSection,
  onAddLesson,
  onUpdateLesson,
  onDeleteLesson,
  onDuplicateLesson,
  onReorderLessons,
  onLessonClick,
}: SectionItemProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [playlistDialogOpen, setPlaylistDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(section.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  const handleSave = () => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== section.title) {
      onUpdateSection(trimmed);
    } else {
      setEditTitle(section.title);
    }
    setIsEditing(false);
  };

  const handleLessonDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const lessons = [...section.lessons].sort((a, b) => a.position - b.position);
    const oldIndex = lessons.findIndex((l) => l.id === active.id);
    const newIndex = lessons.findIndex((l) => l.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    // Build new positions
    const reordered = [...lessons];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    onReorderLessons(reordered.map((l, i) => ({ id: l.id, position: i })));
  };

  const sortedLessons = [...section.lessons].sort((a, b) => a.position - b.position);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border-border-default bg-bg-secondary rounded-xl border transition-colors ${isDragging ? "z-50 opacity-50 shadow-xl" : ""}`}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        {/* Section Header */}
        <div className="flex items-center gap-2 px-3 py-2.5">
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="text-text-tertiary hover:text-text-secondary cursor-grab touch-none"
            tabIndex={-1}
          >
            <GripVertical className="size-4" />
          </button>

          {/* Collapse trigger */}
          <CollapsibleTrigger
            render={<Button variant="ghost" size="icon-xs" className="shrink-0" />}
          >
            <ChevronDown className={`size-4 transition-transform ${isOpen ? "" : "-rotate-90"}`} />
          </CollapsibleTrigger>

          {/* Title */}
          {isEditing ? (
            <Input
              ref={inputRef}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") {
                  setEditTitle(section.title);
                  setIsEditing(false);
                }
              }}
              className="h-7 flex-1 border-none bg-transparent px-1 text-sm font-medium focus-visible:ring-0"
            />
          ) : (
            <span
              className="text-text-primary flex-1 cursor-pointer truncate text-sm font-medium"
              onDoubleClick={() => setIsEditing(true)}
            >
              {section.title}
            </span>
          )}

          {/* Lesson count */}
          <span className="text-text-tertiary shrink-0 text-xs">
            {section.lessons.length} {section.lessons.length === 1 ? "lesson" : "lessons"}
          </span>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon-xs" className="shrink-0" />}
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={4}>
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Pencil className="size-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddLesson("video")}>
                <Video className="size-4" />
                Add Video Lesson
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddLesson("note")}>
                <StickyNote className="size-4" />
                Add Reading Lesson
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddLesson("quiz")}>
                <ClipboardCheck className="size-4" />
                Add Quiz
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPlaylistDialogOpen(true)}>
                <ListVideo className="size-4" />
                Import Playlist
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicateSection}>
                <Copy className="size-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={onDeleteSection}>
                <Trash2 className="size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Lessons List */}
        <CollapsibleContent>
          <div className="flex flex-col gap-1.5 px-3 pb-3">
            {sortedLessons.length > 0 ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleLessonDragEnd}
              >
                <SortableContext
                  items={sortedLessons.map((l) => l.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {sortedLessons.map((lesson) => (
                    <LessonItem
                      key={lesson.id}
                      lesson={lesson}
                      onUpdate={(title) => onUpdateLesson(lesson.id, title)}
                      onDelete={() => onDeleteLesson(lesson.id)}
                      onDuplicate={() => onDuplicateLesson(lesson.id)}
                      onClick={() => onLessonClick?.(lesson.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            ) : (
              <div className="border-border-default text-text-tertiary flex items-center justify-center rounded-lg border border-dashed py-6 text-xs">
                No lessons yet
              </div>
            )}

            {/* Add Lesson dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-text-secondary hover:text-text-primary mt-1 w-full justify-start"
                  />
                }
              >
                <Plus className="size-3.5" />
                Add
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" sideOffset={4}>
                <DropdownMenuItem onClick={() => onAddLesson("video")}>
                  <Video className="size-4" />
                  Video Lesson
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAddLesson("note")}>
                  <StickyNote className="size-4" />
                  Reading Lesson
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAddLesson("quiz")}>
                  <ClipboardCheck className="size-4" />
                  Quiz
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPlaylistDialogOpen(true)}>
                  <ListVideo className="size-4" />
                  Import Playlist
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <ImportPlaylistDialog
              open={playlistDialogOpen}
              onOpenChange={setPlaylistDialogOpen}
              sectionId={section.id}
              courseId={courseId}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
