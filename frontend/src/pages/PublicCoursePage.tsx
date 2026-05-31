/**
 * Public course detail page for shareable links (no auth required).
 */
import { useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  BookOpen,
  Layers,
  Users,
  Loader2,
  Share2,
  Check,
  Video,
  StickyNote,
  ClipboardCheck,
  LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/hub/StarRating";
import { VerifiedBadge } from "@/components/shared/VerifiedBadge";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { usePublicCourseQuery, usePublicCourseSectionsQuery } from "@/hooks/useHub";
import { SINGLE_USER_MODE } from "@/lib/auth";

export default function PublicCoursePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { copied, copyToClipboard } = useCopyToClipboard();

  const { data: course, isLoading, isError } = usePublicCourseQuery(courseId ?? "");
  const { data: sections } = usePublicCourseSectionsQuery(courseId);

  useEffect(() => {
    if (course) {
      document.title = `${course.title} | LearnerVerse`;
    } else {
      document.title = "Course | LearnerVerse";
    }
  }, [course]);

  const publicBase = (
    import.meta.env.VITE_PUBLIC_SITE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "")
  ).replace(/\/$/, "");
  const shareUrl = courseId ? `${publicBase}/courses/${courseId}` : "";
  const openUrl = SINGLE_USER_MODE ? `/learner/hub/${courseId}` : "/login";
  const openLabel = SINGLE_USER_MODE ? "Open in LearnerVerse" : "Sign in to enroll";

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="text-text-tertiary size-6 animate-spin" />
      </div>
    );
  }

  if (isError || !course) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
        <p className="text-text-secondary text-sm">Course not found.</p>
        <Button variant="outline" size="sm" onClick={() => navigate("/")}>
          <ArrowLeft className="mr-1.5 size-4" />
          Go home
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <button
        onClick={() => navigate("/")}
        className="text-text-secondary hover:text-text-primary flex items-center gap-1 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to home
      </button>

      <div className="border-border-default bg-bg-secondary overflow-hidden rounded-xl border">
        {course.thumbnail_url ? (
          <div className="aspect-video w-full overflow-hidden">
            <img src={course.thumbnail_url} alt={course.title} className="size-full object-cover" />
          </div>
        ) : (
          <div className="bg-bg-tertiary flex aspect-video w-full items-center justify-center">
            <BookOpen className="text-text-tertiary size-16" />
          </div>
        )}

        <div className="space-y-4 p-6">
          <div>
            <h1 className="text-text-primary text-2xl font-bold">{course.title}</h1>
            {course.creator_name && (
              <p className="text-text-secondary mt-1 flex items-center gap-1.5 text-sm">
                by {course.creator_name}
                {course.is_creator_verified && <VerifiedBadge size={14} />}
              </p>
            )}
          </div>

          <div className="text-text-secondary flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <StarRating value={course.average_rating} readOnly size="md" />
              <span className="font-medium">
                {course.average_rating > 0 ? course.average_rating.toFixed(1) : "No ratings"}
              </span>
              {course.rating_count > 0 && (
                <span className="text-text-tertiary">
                  ({course.rating_count} review{course.rating_count !== 1 ? "s" : ""})
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Users className="size-4" />
              {course.enrollment_count} enrolled
            </div>
            <div className="flex items-center gap-1">
              <Layers className="size-4" />
              {course.section_count} sections - {course.lesson_count} lessons
            </div>
          </div>

          {course.description && (
            <p className="text-text-secondary text-sm leading-relaxed">{course.description}</p>
          )}

          {course.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {course.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="bg-bg-tertiary text-text-secondary rounded-full px-2.5 py-0.5 text-xs font-medium"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => navigate(openUrl)}>
              <LogIn className="mr-1.5 size-4" />
              {openLabel}
            </Button>
            <Button
              variant="outline"
              onClick={() => shareUrl && copyToClipboard(shareUrl)}
              disabled={!shareUrl}
            >
              {copied ? <Check className="mr-1.5 size-4" /> : <Share2 className="mr-1.5 size-4" />}
              {copied ? "Copied" : "Copy share link"}
            </Button>
          </div>
        </div>
      </div>

      {sections && sections.length > 0 && (
        <div className="border-border-default bg-bg-secondary space-y-3 rounded-xl border p-5">
          <h2 className="text-text-primary text-sm font-semibold">Course Outline</h2>
          <div className="space-y-2">
            {sections.map((section, idx) => (
              <div
                key={section.id}
                className="border-border-default bg-bg-tertiary rounded-lg border p-3"
              >
                <p className="text-text-primary text-xs font-medium">
                  {idx + 1}. {section.title}
                </p>
                {section.lessons.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5 pl-4">
                    {section.lessons.map((lesson) => {
                      const icon =
                        lesson.lesson_type === "quiz" ? (
                          <ClipboardCheck className="size-3 text-purple-500" />
                        ) : lesson.lesson_type === "note" ? (
                          <StickyNote className="size-3 text-amber-500" />
                        ) : (
                          <Video className="text-accent-blue size-3" />
                        );
                      return (
                        <li
                          key={lesson.id}
                          className="text-text-secondary flex items-center gap-1.5 text-xs"
                        >
                          {icon}
                          {lesson.title}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
