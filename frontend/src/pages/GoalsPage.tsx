/**
 * Goals page for setting and tracking course completion deadlines.
 */
import { useState } from "react";
import { useModeAwareNavigate } from "@/hooks/useModeAwareNavigate";
import {
  Target,
  CalendarDays,
  BookOpen,
  Plus,
  Clock,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/study/ProgressBar";
import { GoalDatePicker } from "@/components/goals/GoalDatePicker";
import { PACE_STYLES } from "@/lib/paceStyles";
import { useGoalsQuery } from "@/hooks/useGoals";
import { useCoursesQuery } from "@/hooks/useCourses";
import type { CourseGoalResponse } from "@/types/progress";

export default function GoalsPage() {
  const navigate = useModeAwareNavigate();
  const { data: goals, isLoading } = useGoalsQuery();
  const { data: courses } = useCoursesQuery({ status: "ready" });
  const [pickerState, setPickerState] = useState<{
    open: boolean;
    courseId: string;
    courseTitle: string;
    goalDate: string | null;
  }>({ open: false, courseId: "", courseTitle: "", goalDate: null });

  // Courses without goals — for "Add Goal" flow
  const goalCourseIds = new Set((goals ?? []).map((g) => g.course_id));
  const coursesWithoutGoals = (courses?.items ?? []).filter((c) => !goalCourseIds.has(c.id));

  const activeGoals = goals?.filter((g) => g.pace_status !== "completed") ?? [];
  const completedGoals = goals?.filter((g) => g.pace_status === "completed") ?? [];

  const openPicker = (courseId: string, courseTitle: string, goalDate: string | null) => {
    setPickerState({ open: true, courseId, courseTitle, goalDate });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-text-primary text-2xl font-bold tracking-tight">Learning Goals</h1>
          <p className="text-text-secondary mt-1 text-sm">
            Set target dates for your courses and track your pace.
          </p>
        </div>
        {coursesWithoutGoals.length > 0 && (
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() =>
              openPicker(coursesWithoutGoals[0].id, coursesWithoutGoals[0].title, null)
            }
          >
            <Plus className="size-3.5" />
            Add Goal
          </Button>
        )}
      </div>

      {/* Summary stats */}
      {goals && goals.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Active Goals"
            value={activeGoals.length}
            icon={Target}
            color="text-accent-blue"
          />
          <StatCard
            label="Completed"
            value={completedGoals.length}
            icon={CheckCircle2}
            color="text-accent-purple"
          />
          <StatCard
            label="On Track"
            value={
              activeGoals.filter((g) => g.pace_status === "on_track" || g.pace_status === "ahead")
                .length
            }
            icon={TrendingUp}
            color="text-accent-green"
          />
          <StatCard
            label="Need Attention"
            value={
              activeGoals.filter((g) => g.pace_status === "behind" || g.pace_status === "overdue")
                .length
            }
            icon={AlertTriangle}
            color="text-amber-400"
          />
        </div>
      )}

      {/* Active goals */}
      {activeGoals.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-text-primary text-sm font-medium">Active Goals</h2>
          <div className="space-y-3">
            {activeGoals.map((goal) => (
              <GoalCard
                key={goal.course_id}
                goal={goal}
                onEdit={() => openPicker(goal.course_id, goal.course_title, goal.goal_date)}
                onNavigate={() => navigate(`/study/${goal.course_id}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed goals */}
      {completedGoals.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-text-primary text-sm font-medium">Completed</h2>
          <div className="space-y-3">
            {completedGoals.map((goal) => (
              <GoalCard
                key={goal.course_id}
                goal={goal}
                onEdit={() => openPicker(goal.course_id, goal.course_title, goal.goal_date)}
                onNavigate={() => navigate(`/study/${goal.course_id}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Courses without goals */}
      {coursesWithoutGoals.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-text-tertiary text-sm font-medium">Courses Without Goals</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {coursesWithoutGoals.map((course) => (
              <button
                key={course.id}
                onClick={() => openPicker(course.id, course.title, null)}
                className="group border-border-default bg-bg-secondary hover:border-accent-blue/40 hover:bg-accent-blue/5 flex items-center gap-3 rounded-xl border border-dashed p-4 text-left transition-colors"
              >
                <div className="bg-bg-tertiary group-hover:bg-accent-blue/10 flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors">
                  <Plus className="text-text-tertiary group-hover:text-accent-blue size-4 transition-colors" />
                </div>
                <div className="min-w-0">
                  <p className="text-text-primary truncate text-sm font-medium">{course.title}</p>
                  <p className="text-text-tertiary text-xs">
                    {course.lesson_count} lesson{course.lesson_count !== 1 ? "s" : ""} &middot; Set
                    a goal
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && (!goals || goals.length === 0) && coursesWithoutGoals.length === 0 && (
        <div className="border-border-default flex min-h-[40vh] items-center justify-center rounded-xl border border-dashed py-16">
          <div className="flex max-w-sm flex-col items-center text-center">
            <div className="bg-accent-blue/10 mb-4 flex size-14 items-center justify-center rounded-full">
              <Target className="text-accent-blue/50 size-7" />
            </div>
            <h3 className="text-text-primary text-base font-medium">No courses available</h3>
            <p className="text-text-secondary mt-1 text-sm">
              Publish some courses in Creator mode, then set learning goals to stay on track.
            </p>
          </div>
        </div>
      )}

      {/* Goal picker dialog */}
      <GoalDatePicker
        courseId={pickerState.courseId}
        courseTitle={pickerState.courseTitle}
        currentGoalDate={pickerState.goalDate}
        open={pickerState.open}
        onOpenChange={(open) => setPickerState((prev) => ({ ...prev, open }))}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="border-border-default bg-bg-secondary rounded-xl border p-4">
      <div className="flex items-center gap-2">
        <Icon className={`size-4 ${color}`} />
        <span className="text-text-tertiary text-xs">{label}</span>
      </div>
      <p className="text-text-primary mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function GoalCard({
  goal,
  onEdit,
  onNavigate,
}: {
  goal: CourseGoalResponse;
  onEdit: () => void;
  onNavigate: () => void;
}) {
  const style =
    PACE_STYLES[(goal.pace_status as keyof typeof PACE_STYLES) ?? "on_track"] ??
    PACE_STYLES.on_track;
  const Icon = style.icon;

  const formattedDate = goal.goal_date
    ? new Date(goal.goal_date + "T00:00:00").toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div
      className={`rounded-xl border ${style.border} bg-bg-secondary hover:border-border-hover p-4 transition-colors`}
    >
      <div className="flex items-start gap-3">
        {/* Status icon */}
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${style.bg}`}>
          <Icon className={`size-5 ${style.color}`} />
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          {/* Title row */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <button
                onClick={onNavigate}
                className="text-text-primary hover:text-accent-blue truncate text-sm font-semibold transition-colors"
              >
                {goal.course_title}
              </button>
              <div className="text-text-tertiary mt-0.5 flex flex-wrap items-center gap-3 text-xs">
                {formattedDate && (
                  <span className="flex items-center gap-1">
                    <CalendarDays className="size-3" />
                    {formattedDate}
                  </span>
                )}
                {goal.days_remaining != null && goal.days_remaining > 0 && (
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {goal.days_remaining}d remaining
                  </span>
                )}
                {goal.lessons_per_week_needed != null && goal.pace_status !== "completed" && (
                  <span>{goal.lessons_per_week_needed} lessons/week needed</span>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${style.bg} ${style.color}`}
              >
                {style.label}
              </span>
              <Button variant="ghost" size="sm" onClick={onEdit} className="h-7 text-xs">
                {goal.goal_date ? "Edit" : "Set Goal"}
              </Button>
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-1.5">
            <ProgressBar value={goal.percentage} size="sm" />
            <div className="text-text-tertiary flex items-center justify-between text-xs">
              <span className="flex items-center gap-1">
                <BookOpen className="size-3" />
                {goal.completed_lessons}/{goal.total_lessons} lessons
              </span>
              <span>{goal.percentage}%</span>
            </div>
          </div>

          {/* Completion message */}
          {goal.pace_status === "completed" &&
            goal.completed_early_by_days != null &&
            goal.completed_early_by_days > 0 && (
              <p className="text-accent-purple text-xs font-medium">
                🎉 Finished {goal.completed_early_by_days} day
                {goal.completed_early_by_days === 1 ? "" : "s"} early!
              </p>
            )}
        </div>
      </div>
    </div>
  );
}
