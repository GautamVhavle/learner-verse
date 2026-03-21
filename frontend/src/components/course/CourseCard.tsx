/**
 * Card component displaying a course with its metadata and action menu.
 */
import { useState } from "react";
import {
  Copy,
  MoreHorizontal,
  Pencil,
  Trash2,
  LayoutList,
  Loader2,
} from "lucide-react";
import { useModeAwareNavigate } from "@/hooks/useModeAwareNavigate";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { CourseStatusBadge } from "@/components/course/CourseStatusBadge";
import type { Course } from "@/types/course";

interface CourseCardProps {
  course: Course;
  onEdit: (course: Course) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  isDuplicating?: boolean;
}

export function CourseCard({
  course,
  onEdit,
  onDelete,
  onDuplicate,
  isDuplicating,
}: CourseCardProps) {
  const navigate = useModeAwareNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <div
        data-testid="course-card"
        className="group relative flex cursor-pointer flex-col rounded-xl border border-border-default bg-bg-secondary transition-colors hover:border-border-hover"
        onClick={() => navigate(`/courses/${course.id}/edit`)}
      >
        {/* Thumbnail */}
        <div className="relative aspect-video w-full overflow-hidden rounded-t-xl bg-bg-tertiary">
          {course.thumbnail_url ? (
            <img
              src={course.thumbnail_url}
              alt={course.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-text-tertiary">
              <span className="text-3xl font-bold opacity-30">
                {course.title.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          {/* Duplicating overlay */}
          {isDuplicating && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <Loader2 className="size-6 animate-spin text-white" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 text-sm font-medium text-text-primary">
              {course.title}
            </h3>
            <div onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  }
                >
                  <MoreHorizontal className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="bottom" sideOffset={4}>
                  <DropdownMenuItem onClick={() => navigate(`/courses/${course.id}/edit`)}>
                    <LayoutList className="size-4" />
                    Build
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit(course)}>
                    <Pencil className="size-4" />
                    Edit Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setConfirmOpen(true)}>
                    <Copy className="size-4" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => onDelete(course.id)}
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {course.description && (
            <p className="line-clamp-2 text-xs text-text-secondary">
              {course.description}
            </p>
          )}

          {/* Stats */}
          <p className="text-[11px] tabular-nums text-text-tertiary">
            {course.section_count} {course.section_count === 1 ? "section" : "sections"} &middot;{" "}
            {course.lesson_count} {course.lesson_count === 1 ? "lesson" : "lessons"}
          </p>

          {/* Tags & Status */}
          <div className="mt-auto flex items-center gap-2 pt-1">
            <CourseStatusBadge status={course.status} />
            {course.tags.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="rounded-full bg-bg-tertiary px-2 py-0.5 text-[10px] text-text-secondary"
              >
                {tag.name}
              </span>
            ))}
            {course.tags.length > 3 && (
              <span className="text-[10px] text-text-tertiary">
                +{course.tags.length - 3}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Duplicate confirm dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Duplicate Course</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a full copy of &ldquo;{course.title}&rdquo; including all
              sections, lessons, and reference links. The copy will be set to Draft status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDuplicate(course.id);
                setConfirmOpen(false);
              }}
            >
              <Copy className="size-4" />
              Duplicate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
