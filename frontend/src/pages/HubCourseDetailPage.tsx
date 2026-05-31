/**
 * Course Hub Detail page - full course info, enrollment, ratings, and section outline.
 */
import { useParams, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Layers,
  Link2,
  Loader2,
  Users,
  LogIn,
  LogOut,
  Play,
  MessageSquare,
  Trash2,
  Video,
  StickyNote,
  ClipboardCheck,
  CheckCircle2,
  FileEdit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/hub/StarRating";
import { VerifiedBadge } from "@/components/shared/VerifiedBadge";
import { toast } from "sonner";
import {
  useHubCourseQuery,
  useHubSectionsQuery,
  useRatingsQuery,
  useCreateRatingMutation,
  useDeleteRatingMutation,
} from "@/hooks/useHub";
import {
  useEnrollMutation,
  useUnenrollMutation,
  useEnrolledCoursesQuery,
} from "@/hooks/useEnrollments";
import { useCourseProgressQuery } from "@/hooks/useProgress";
import { useAuth } from "@/hooks/useAuth";
import { useMode } from "@/hooks/useMode";
import { useUserQuery } from "@/hooks/useUser";

export default function HubCourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { mode } = useMode();
  const modePrefix = mode === "creator" ? "/creator" : "/learner";
  const publicBase = (
    import.meta.env.VITE_PUBLIC_SITE_URL ??
    (typeof window !== "undefined" ? window.location.origin : "")
  ).replace(/\/$/, "");

  const { data: course, isLoading } = useHubCourseQuery(courseId ?? "");
  const { data: ratingsData } = useRatingsQuery(courseId ?? "");
  const { data: enrolledData } = useEnrolledCoursesQuery();
  const { data: dbUser } = useUserQuery();

  useEffect(() => {
    if (course) {
      document.title = `${course.title} | LearnerVerse`;
    }
  }, [course]);
  const enrollMutation = useEnrollMutation();
  const unenrollMutation = useUnenrollMutation();
  const createRating = useCreateRatingMutation(courseId ?? "");
  const deleteRating = useDeleteRatingMutation(courseId ?? "");

  const [newRating, setNewRating] = useState(0);
  const [newReview, setNewReview] = useState("");

  // Fetch sections for course outline
  const { data: sections } = useHubSectionsQuery(courseId);

  const isEnrolled = enrolledData?.items.some((c) => c.id === courseId) ?? false;
  const isOwner = !!(dbUser && course && dbUser.id === course.user_id);
  const { data: progress } = useCourseProgressQuery(isEnrolled ? courseId : undefined);
  const isCompleted = isEnrolled && progress?.is_locked;
  const myRating = ratingsData?.items.find((r) => r.user_id === user?.id);
  const ratings = ratingsData?.items ?? [];

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="text-text-tertiary size-6 animate-spin" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-2">
        <p className="text-text-secondary text-sm">Course not found.</p>
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          Go back
        </Button>
      </div>
    );
  }

  const handleEnroll = () => enrollMutation.mutate(course.id);
  const handleUnenroll = () => {
    if (isCompleted) {
      const confirmed = window.confirm(
        "You've completed this course. Unenrolling will remove your Completed status. Continue?",
      );
      if (!confirmed) return;
    }
    unenrollMutation.mutate(course.id);
  };
  const handleSubmitRating = () => {
    if (newRating < 1) return;
    createRating.mutate(
      { rating: newRating, review: newReview || null },
      {
        onSuccess: () => {
          setNewRating(0);
          setNewReview("");
        },
      },
    );
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Back */}
      <button
        onClick={() => navigate(`${modePrefix}/hub`)}
        className="text-text-secondary hover:text-text-primary flex items-center gap-1 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to Course Hub
      </button>

      {/* Hero */}
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

          {/* Stats */}
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
              {course.section_count} sections · {course.lesson_count} lessons
            </div>
          </div>

          {course.description && (
            <p className="text-text-secondary text-sm leading-relaxed">{course.description}</p>
          )}

          {/* Tags */}
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

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {isOwner && (
              <Button
                variant="outline"
                onClick={() => navigate(`/creator/courses/${course.id}/edit`)}
                className="gap-1.5"
              >
                <FileEdit className="size-4" />
                Edit Course
              </Button>
            )}
            {isEnrolled ? (
              <>
                {isCompleted ? (
                  <>
                    <div className="bg-accent-green/10 flex items-center gap-2 rounded-lg px-4 py-2">
                      <CheckCircle2 className="text-accent-green size-5" />
                      <span className="text-accent-green text-sm font-semibold">Completed</span>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => navigate(`${modePrefix}/study/${course.id}`)}
                    >
                      <BookOpen className="mr-1.5 size-4" />
                      Revisit
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => navigate(`${modePrefix}/study/${course.id}`)}>
                    <Play className="mr-1.5 size-4" />
                    {progress ? `Continue (${Math.round(progress.percentage)}%)` : "Go to Course"}
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={handleUnenroll}
                  disabled={unenrollMutation.isPending}
                >
                  <LogOut className="mr-1.5 size-4" />
                  Unenroll
                </Button>
              </>
            ) : (
              <Button
                onClick={handleEnroll}
                disabled={enrollMutation.isPending}
                className="bg-accent-blue hover:bg-accent-blue/90 text-white"
              >
                <LogIn className="mr-1.5 size-4" />
                {enrollMutation.isPending ? "Enrolling..." : "Enroll Now"}
              </Button>
            )}
            {course.is_public && (
              <Button
                variant="outline"
                onClick={async () => {
                  const shareUrl = `${publicBase}/courses/${course.id}`;
                  try {
                    await navigator.clipboard.writeText(shareUrl);
                    toast.success("Share link copied to clipboard");
                  } catch {
                    toast.error("Failed to copy link");
                  }
                }}
              >
                <Link2 className="mr-1.5 size-4" />
                Share
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Course Outline */}
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

      {/* Rating Form - hidden for course owner */}
      {!isOwner && !myRating && (
        <div className="border-border-default bg-bg-secondary space-y-3 rounded-xl border p-5">
          <h2 className="text-text-primary text-sm font-semibold">Rate this Course</h2>
          <div className="space-y-3">
            <StarRating value={newRating} onChange={setNewRating} size="lg" />
            <textarea
              value={newReview}
              onChange={(e) => setNewReview(e.target.value)}
              placeholder="Write a review (optional)..."
              className="border-border-default bg-bg-tertiary text-text-primary placeholder:text-text-tertiary focus:border-accent-blue w-full resize-none rounded-lg border p-3 text-sm focus:outline-none"
              rows={3}
              maxLength={2000}
            />
            <Button
              onClick={handleSubmitRating}
              disabled={newRating < 1 || createRating.isPending}
              size="sm"
              className="bg-accent-blue hover:bg-accent-blue/90 text-white"
            >
              {createRating.isPending ? "Submitting..." : "Submit Rating"}
            </Button>
          </div>
        </div>
      )}

      {/* Ratings List */}
      {ratings.length > 0 && (
        <div className="border-border-default bg-bg-secondary space-y-3 rounded-xl border p-5">
          <div className="flex items-center gap-2">
            <MessageSquare className="text-text-secondary size-4" />
            <h2 className="text-text-primary text-sm font-semibold">Reviews ({ratings.length})</h2>
          </div>
          <div className="space-y-3">
            {ratings.map((r) => (
              <div
                key={r.id}
                className="border-border-default bg-bg-tertiary rounded-lg border p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="bg-bg-quaternary text-text-secondary flex size-7 items-center justify-center rounded-full text-xs font-medium">
                      {r.user_name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div>
                      <p className="text-text-primary text-xs font-medium">{r.user_name}</p>
                      <StarRating value={r.rating} readOnly size="sm" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-text-tertiary text-[10px]">
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                    {r.user_id === user?.id && (
                      <button
                        onClick={() => deleteRating.mutate()}
                        className="text-text-tertiary hover:text-accent-red transition-colors"
                        title="Delete your review"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    )}
                  </div>
                </div>
                {r.review && (
                  <p className="text-text-secondary mt-2 text-xs leading-relaxed">{r.review}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
