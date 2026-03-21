/**
 * Drag-and-drop section list with reordering support for course builder.
 */
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
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionItem } from "@/components/course/SectionItem";
import type { Section, ReorderItem, LessonType } from "@/types/section";

interface SectionListProps {
  sections: Section[];
  onAddSection: () => void;
  onUpdateSection: (sectionId: string, title: string) => void;
  onDeleteSection: (sectionId: string) => void;
  onDuplicateSection: (sectionId: string) => void;
  onReorderSections: (items: ReorderItem[]) => void;
  onAddLesson: (sectionId: string, type: LessonType) => void;
  onUpdateLesson: (sectionId: string, lessonId: string, title: string) => void;
  onDeleteLesson: (sectionId: string, lessonId: string) => void;
  onDuplicateLesson: (sectionId: string, lessonId: string) => void;
  onReorderLessons: (sectionId: string, items: ReorderItem[]) => void;
  onLessonClick?: (lessonId: string) => void;
}

export function SectionList({
  sections,
  onAddSection,
  onUpdateSection,
  onDeleteSection,
  onDuplicateSection,
  onReorderSections,
  onAddLesson,
  onUpdateLesson,
  onDeleteLesson,
  onDuplicateLesson,
  onReorderLessons,
  onLessonClick,
}: SectionListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const sorted = [...sections].sort((a, b) => a.position - b.position);

  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sorted.findIndex((s) => s.id === active.id);
    const newIndex = sorted.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...sorted];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    onReorderSections(reordered.map((s, i) => ({ id: s.id, position: i })));
  };

  if (sorted.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-default py-16"
        data-testid="empty-state"
      >
        <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-accent-blue/10">
          <Plus className="size-7 text-accent-blue/50" />
        </div>
        <p className="text-sm font-medium text-text-primary">
          No sections yet
        </p>
        <p className="mb-4 mt-1 text-xs text-text-secondary">
          Add your first section to start building the course.
        </p>
        <Button onClick={onAddSection} size="sm">
          <Plus className="size-4" />
          Add Section
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleSectionDragEnd}
      >
        <SortableContext
          items={sorted.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          {sorted.map((section) => (
            <SectionItem
              key={section.id}
              section={section}
              onUpdateSection={(title) => onUpdateSection(section.id, title)}
              onDeleteSection={() => onDeleteSection(section.id)}
              onDuplicateSection={() => onDuplicateSection(section.id)}
              onAddLesson={(type) => onAddLesson(section.id, type)}
              onUpdateLesson={(lessonId, title) =>
                onUpdateLesson(section.id, lessonId, title)
              }
              onDeleteLesson={(lessonId) =>
                onDeleteLesson(section.id, lessonId)
              }
              onDuplicateLesson={(lessonId) =>
                onDuplicateLesson(section.id, lessonId)
              }
              onReorderLessons={(items) =>
                onReorderLessons(section.id, items)
              }
              onLessonClick={onLessonClick}
            />
          ))}
        </SortableContext>
      </DndContext>

      <Button
        variant="outline"
        className="w-full border-dashed"
        onClick={onAddSection}
      >
        <Plus className="size-4" />
        Add Section
      </Button>
    </div>
  );
}
