/**
 * Course Hub Detail page — full course info, enrollment, ratings, and section outline.
 */
import { useParams, useNavigate } from "react-router";
import { useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Clock,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/hub/StarRating";
import { toast } from "sonner";
import { useHubCourseQuery, useRatingsQuery, useCreateRatingMutation, useDeleteRatingMutation } from "@/hooks/useHub";
import { useEnrollMutation, useUnenrollMutation, useEnrolledCoursesQuery } from "@/hooks/useEnrollments";
import { useCourseProgressQuery } from "@/hooks/useProgress";
import { useAuth } from "@/hooks/useAuth";
import { useMode } from "@/hooks/useMode";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import type { Section } from "@/types/section";

export default function HubCourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { mode } = useMode();
  const modePrefix = mode === "creator" ? "/creator" : "/learner";

  const { data: course, isLoading } = useHubCourseQuery(courseId ?? "");
  const { data: ratingsData } = useRatingsQuery(courseId ?? "");
  const { data: enrolledData } = useEnrolledCoursesQuery();
  const enrollMutation = useEnrollMutation();
  const unenrollMutation = useUnenrollMutation();
  const createRating = useCreateRatingMutation(courseId ?? "");
  const deleteRating = useDeleteRatingMutation(courseId ?? "");

  const [newRating, setNewRating] = useState(0);
  const [newReview, setNewReview] = useState("");

  // Fetch sections for course outline
  const { data: sections } = useQuery<Section[]>({
    queryKey: ["hub-sections", courseId],
    queryFn: () => api.get(`/sections/${courseId}`),
    enabled: !!courseId,
  });

  const isEnrolled = enrolledData?.items.some((c) => c.id === courseId) ?? false;
  const { data: progress } = useCourseProgressQuery(isEnrolled ? courseId : undefined);
  const isCompleted = isEnrolled && progress?.percentage === 100;
  const myRating = ratingsData?.items.find((r) => r.user_id === user?.id);
  const ratings = ratingsData?.items ?? [];

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-text-tertiary" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-2">
        <p className="text-sm text-text-secondary">Course not found.</p>
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          Go back
        </Button>
      </div>
    );
  }

  const handleEnroll = () => enrollMutation.mutate(course.id);
  const handleUnenroll = () => unenrollMutation.mutate(course.id);
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
        className="flex items-center gap-1 text-sm text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="size-4" />
        Back to Course Hub
      </button>

      {/* Hero */}
      <div className="overflow-hidden rounded-xl border border-border-default bg-bg-secondary">
        {course.thumbnail_url ? (
          <div className="aspect-video w-full overflow-hidden">
            <img
              src={course.thumbnail_url}
              alt={course.title}
              className="size-full object-cover"
            />
          </div>
        ) : (
          <div className="flex aspect-video w-full items-center justify-center bg-bg-tertiary">
            <BookOpen className="size-16 text-text-tertiary" />
          </div>
        )}

        <div className="space-y-4 p-6">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{course.title}</h1>
            {course.creator_name && (
              <p className="mt-1 text-sm text-text-secondary">by {course.creator_name}</p>
            )}
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary">
            <div className="flex items-center gap-1.5">
              <StarRating value={course.average_rating} readOnly size="md" />
              <span className="font-medium">
                {course.average_rating > 0 ? course.average_rating.toFixed(1) : "No ratings"}
              </span>
              {course.rating_count > 0 && (
                <span className="text-text-tertiary">({course.rating_count} review{course.rating_count !== 1 ? "s" : ""})</span>
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
            <p className="text-sm leading-relaxed text-text-secondary">{course.description}</p>
          )}

          {/* Tags */}
          {course.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {course.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-full bg-bg-tertiary px-2.5 py-0.5 text-xs font-medium text-text-secondary"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            {isEnrolled ? (
              <>
                {isCompleted ? (
                  <div className="flex items-center gap-2 rounded-lg bg-accent-green/10 px-4 py-2">
                    <CheckCircle2 className="size-5 text-accent-green" />
                    <span className="text-sm font-semibold text-accent-green">
                      Completed
                    </span>
                  </div>
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
                className="bg-accent-blue text-white hover:bg-accent-blue/90"
              >
                <LogIn className="mr-1.5 size-4" />
                {enrollMutation.isPending ? "Enrolling..." : "Enroll Now"}
              </Button>
            )}
            {course.is_public && (
              <Button
                variant="outline"
                onClick={async () => {
                  const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";
                  const shareUrl = `${apiBase}/share/course/${course.id}`;
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
        <div className="space-y-3 rounded-xl border border-border-default bg-bg-secondary p-5">
          <h2 className="text-sm font-semibold text-text-primary">Course Outline</h2>
          <div className="space-y-2">
            {sections.map((section, idx) => (
              <div key={section.id} className="rounded-lg border border-border-default bg-bg-tertiary p-3">
                <p className="text-xs font-medium text-text-primary">
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
                          <Video className="size-3 text-accent-blue" />
                        );
                      return (
                        <li key={lesson.id} className="flex items-center gap-1.5 text-xs text-text-secondary">
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

      {/* Rating Form */}
      {!myRating && (
        <div className="space-y-3 rounded-xl border border-border-default bg-bg-secondary p-5">
          <h2 className="text-sm font-semibold text-text-primary">Rate this Course</h2>
          <div className="space-y-3">
            <StarRating value={newRating} onChange={setNewRating} size="lg" />
            <textarea
              value={newReview}
              onChange={(e) => setNewReview(e.target.value)}
              placeholder="Write a review (optional)..."
              className="w-full resize-none rounded-lg border border-border-default bg-bg-tertiary p-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-blue focus:outline-none"
              rows={3}
              maxLength={2000}
            />
            <Button
              onClick={handleSubmitRating}
              disabled={newRating < 1 || createRating.isPending}
              size="sm"
              className="bg-accent-blue text-white hover:bg-accent-blue/90"
            >
              {createRating.isPending ? "Submitting..." : "Submit Rating"}
            </Button>
          </div>
        </div>
      )}

      {/* Ratings List */}
      {ratings.length > 0 && (
        <div className="space-y-3 rounded-xl border border-border-default bg-bg-secondary p-5">
          <div className="flex items-center gap-2">
            <MessageSquare className="size-4 text-text-secondary" />
            <h2 className="text-sm font-semibold text-text-primary">
              Reviews ({ratings.length})
            </h2>
          </div>
          <div className="space-y-3">
            {ratings.map((r) => (
              <div
                key={r.id}
                className="rounded-lg border border-border-default bg-bg-tertiary p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-full bg-bg-quaternary text-xs font-medium text-text-secondary">
                      {r.user_name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-text-primary">{r.user_name}</p>
                      <StarRating value={r.rating} readOnly size="sm" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-text-tertiary">
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                    {r.user_id === user?.id && (
                      <button
                        onClick={() => deleteRating.mutate()}
                        className="text-text-tertiary transition-colors hover:text-accent-red"
                        title="Delete your review"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    )}
                  </div>
                </div>
                {r.review && (
                  <p className="mt-2 text-xs leading-relaxed text-text-secondary">{r.review}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
