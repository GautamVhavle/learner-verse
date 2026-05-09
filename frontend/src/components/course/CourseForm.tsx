/**
 * Dialog form for creating or editing a course title and description.
 */
import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/shared/DatePicker";
import { useUploadThumbnailMutation } from "@/hooks/useCourses";
import type { Course, CourseCreate, CourseUpdate } from "@/types/course";

interface CourseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course?: Course | null;
  onSubmit: (data: CourseCreate | CourseUpdate) => void;
  isPending?: boolean;
}

export function CourseForm({ open, onOpenChange, course, onSubmit, isPending }: CourseFormProps) {
  const isEdit = !!course;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [goalDate, setGoalDate] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useUploadThumbnailMutation();

  useEffect(() => {
    if (course) {
      setTitle(course.title);
      setDescription(course.description ?? "");
      setTagsInput(course.tags.map((t) => t.name).join(", "));
      setGoalDate(course.goal_date ?? "");
      setThumbnailUrl(course.thumbnail_url);
    } else {
      setTitle("");
      setDescription("");
      setTagsInput("");
      setGoalDate("");
      setThumbnailUrl(null);
    }
  }, [course, open]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so the same file can be re-selected
    e.target.value = "";

    const result = await uploadMutation.mutateAsync(file);
    setThumbnailUrl(result.url);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    onSubmit({
      title,
      description: description || null,
      thumbnail_url: thumbnailUrl,
      goal_date: goalDate || null,
      tags,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Course" : "New Course"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Thumbnail upload */}
          <div className="flex flex-col gap-1.5">
            <label className="text-text-secondary text-xs font-medium">Thumbnail</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileSelect}
              className="hidden"
            />
            {thumbnailUrl ? (
              <div className="border-border-default bg-bg-tertiary relative aspect-video w-full overflow-hidden rounded-lg border">
                <img
                  src={thumbnailUrl}
                  alt="Course thumbnail"
                  className="h-full w-full object-cover"
                />
                <div className="absolute top-2 right-2 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-md bg-black/60 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/80"
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={() => setThumbnailUrl(null)}
                    className="rounded-md bg-black/60 p-1 text-white backdrop-blur-sm transition-colors hover:bg-black/80"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadMutation.isPending}
                className="border-border-default bg-bg-tertiary text-text-tertiary hover:border-border-hover hover:text-text-secondary flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed transition-colors"
              >
                {uploadMutation.isPending ? (
                  <Loader2 className="size-6 animate-spin" />
                ) : (
                  <>
                    <ImagePlus className="size-6" />
                    <span className="text-xs">Click to upload thumbnail</span>
                  </>
                )}
              </button>
            )}
            {uploadMutation.isError && (
              <p className="text-accent-red text-xs">Upload failed. Please try again.</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="course-title" className="text-text-secondary text-xs font-medium">
              Title <span className="text-accent-red">*</span>
            </label>
            <Input
              id="course-title"
              placeholder="e.g. Intro to Machine Learning"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="course-description" className="text-text-secondary text-xs font-medium">
              Description
            </label>
            <textarea
              id="course-description"
              placeholder="What's this course about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 w-full resize-none rounded-lg border bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:ring-3"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="course-tags" className="text-text-secondary text-xs font-medium">
              Tags <span className="text-text-tertiary">(comma separated)</span>
            </label>
            <Input
              id="course-tags"
              placeholder="e.g. python, machine learning"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-text-secondary text-xs font-medium">Goal Date</label>
            <DatePicker
              value={goalDate || null}
              onChange={(date) => setGoalDate(date ?? "")}
              placeholder="Pick a target completion date"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || isPending}>
              {isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Course"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
