/**
 * Learner dashboard — personal learning overview.
 *
 * Shows only the courses the user has explicitly enrolled in.
 * Banners surface streak, certificate, and goal information.
 * The "Continue Learning" hero highlights the most recently studied course.
 * An empty state directs the user to Browse Courses to enrol in their first course.
 */
import {
  Award,
  Compass,
  Flame,
  GraduationCap,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { ContinueLearning } from "@/components/dashboard/ContinueLearning";
import { LearnerCourseCard } from "@/components/dashboard/LearnerCourseCard";
import { useEnrolledCoursesQuery } from "@/hooks/useEnrollments";
import { useCourseProgressQuery } from "@/hooks/useProgress";
import { useStudyStateQuery } from "@/hooks/useStudy";
import { useCertificatesQuery } from "@/hooks/useCertificates";
import { useGoalsQuery } from "@/hooks/useGoals";
import { useStreakQuery } from "@/hooks/useStats";
import { useModeAwareNavigate } from "@/hooks/useModeAwareNavigate";
import type { Course } from "@/types/course";

export function LearnerDashboard() {
  const navigate = useModeAwareNavigate();
  const { data: enrolledData, isLoading } = useEnrolledCoursesQuery();
  const { data: certificates } = useCertificatesQuery();
  const { data: goals } = useGoalsQuery();
  const { data: streak } = useStreakQuery();

  const items = enrolledData?.items ?? [];
  const certs = certificates ?? [];
  const activeGoals = (goals ?? []).filter((g) => g.pace_status !== "completed");

  // Most recently enrolled course is the candidate for "Continue Learning"
  const mostRecentCourse = items[0];

  // Partition enrolled courses into in-progress and not-started based on progress
  // (the actual % is loaded per-card, so we just show them all in one grid for now
  // but surface "Continue Learning" at the top if the user has started studying)

  return (
    <div className="space-y-8">
      {/* Hero header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          My Learning
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Track your progress and pick up where you left off.
        </p>
      </div>

      {/* Certificates earned banner */}
      {certs.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-accent-purple/20 bg-accent-purple/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-accent-purple/15">
              <Award className="size-5 text-accent-purple" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">
                {certs.length} {certs.length === 1 ? "Certificate" : "Certificates"} Earned
              </p>
              <p className="text-xs text-text-secondary">Keep going to earn more!</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/certificates")}
            className="text-accent-purple hover:text-accent-purple"
          >
            View All
          </Button>
        </div>
      )}

      {/* Active goals banner */}
      {activeGoals.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-accent-blue/20 bg-accent-blue/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-accent-blue/15">
              <Target className="size-5 text-accent-blue" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">
                {activeGoals.length} Active {activeGoals.length === 1 ? "Goal" : "Goals"}
              </p>
              <p className="text-xs text-text-secondary">
                {activeGoals.some(
                  (g) => g.pace_status === "behind" || g.pace_status === "overdue",
                )
                  ? "Some goals need attention"
                  : "You're making great progress!"}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/goals")}
            className="text-accent-blue hover:text-accent-blue"
          >
            View Goals
          </Button>
        </div>
      )}

      {/* Streak banner */}
      {streak && streak.current_streak > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-orange-400/20 bg-orange-400/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-orange-400/15">
              <Flame className="size-5 text-orange-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">
                {streak.current_streak} Day Streak{" "}
                <span className="text-orange-400">🔥</span>
              </p>
              <p className="text-xs text-text-secondary">
                {streak.current_streak >= streak.longest_streak
                  ? "You're on your best streak!"
                  : `Best: ${streak.longest_streak} days`}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/stats")}
            className="text-orange-400 hover:text-orange-400"
          >
            View Stats
          </Button>
        </div>
      )}

      {/* Continue Learning hero — only shown once the user has started a course */}
      {mostRecentCourse && (
        <ContinueLearningWrapper course={mostRecentCourse} />
      )}

      {/* Empty state — no enrolled courses yet */}
      {!isLoading && items.length === 0 && (
        <EmptyState
          icon={
            <div className="flex size-14 items-center justify-center rounded-full bg-accent-blue/10">
              <GraduationCap className="size-7 text-accent-blue/50" />
            </div>
          }
          title="No courses enrolled yet"
          description="Browse the course catalog and enrol in a course to start tracking your progress here."
          actionLabel="Browse Courses"
          onAction={() => navigate("/hub")}
        />
      )}

      {/* Enrolled course grid */}
      {items.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-text-primary">
              My Courses
              <span className="ml-2 rounded-full bg-bg-tertiary px-2 py-0.5 text-xs text-text-tertiary">
                {items.length}
              </span>
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/hub")}
              className="gap-1 text-xs text-text-secondary hover:text-text-primary"
            >
              <Compass className="size-3.5" />
              Browse more
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((course) => (
              <LearnerCourseCard
                key={course.id}
                course={course}
                onStudy={() => navigate(`/study/${course.id}`)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Wrapper that loads study state + progress for the Continue Learning hero. */
function ContinueLearningWrapper({ course }: { course: Course }) {
  const { data: progress } = useCourseProgressQuery(course.id);
  const { data: studyState } = useStudyStateQuery(course.id);

  if (!progress || progress.total_lessons === 0) return null;
  // Only show if the user has started (has some progress or a saved study position)
  if (progress.completed_lessons === 0 && !studyState) return null;

  return (
    <ContinueLearning
      course={course}
      progress={progress}
      studyState={studyState ?? null}
    />
  );
}

