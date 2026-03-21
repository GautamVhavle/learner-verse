/**
 * Visual indicator showing goal pace status (on track, ahead, behind, etc.).
 */
import { Clock, CalendarDays } from "lucide-react";
import { PACE_STYLES } from "@/lib/paceStyles";
import type { GoalResponse } from "@/types/progress";

interface PaceIndicatorProps {
  goal: GoalResponse;
  compact?: boolean;
}

/** Extended labels and description generators layered on top of the shared PACE_STYLES. */
const PACE_DESCRIPTIONS: Record<
  string,
  {
    label: string;
    description: (lpw: number, earlyDays?: number | null) => string;
  }
> = {
  on_track: {
    label: "On Track",
    description: (lpw) =>
      `${lpw} lesson${lpw === 1 ? "" : "s"}/week to stay on track`,
  },
  ahead: {
    label: "Ahead of Schedule!",
    description: () => "You're making great progress!",
  },
  behind: {
    label: "Behind Schedule",
    description: (lpw) => `Need ${lpw} lessons/week to catch up`,
  },
  completed: {
    label: "Goal Met!",
    description: (_lpw, earlyDays) =>
      earlyDays
        ? `Finished ${earlyDays} day${earlyDays === 1 ? "" : "s"} early!`
        : "Course completed!",
  },
  overdue: {
    label: "Overdue",
    description: () => "Goal date has passed",
  },
};

export function PaceIndicator({ goal, compact = false }: PaceIndicatorProps) {
  const style = PACE_STYLES[goal.pace_status] ?? PACE_STYLES.on_track;
  const desc = PACE_DESCRIPTIONS[goal.pace_status] ?? PACE_DESCRIPTIONS.on_track;
  const Icon = style.icon;

  const formattedDate = new Date(goal.goal_date + "T00:00:00").toLocaleDateString(
    undefined,
    { month: "short", day: "numeric", year: "numeric" },
  );

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${style.bg} ${style.color}`}
      >
        <Icon className="size-3" />
        <span>{desc.label}</span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border ${style.border} ${style.bg} p-4 transition-colors`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${style.bg} ${style.color}`}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className={`text-sm font-semibold ${style.color}`}>
              {desc.label}
            </p>
            <div className="flex items-center gap-1 text-xs text-text-tertiary">
              <CalendarDays className="size-3" />
              <span>{formattedDate}</span>
            </div>
          </div>
          <p className="mt-0.5 text-xs text-text-secondary">
            {desc.description(
              goal.lessons_per_week_needed,
              goal.completed_early_by_days,
            )}
          </p>
          {goal.pace_status !== "completed" && goal.days_remaining > 0 && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-text-tertiary">
              <Clock className="size-3" />
              <span>
                {goal.days_remaining} day{goal.days_remaining === 1 ? "" : "s"}{" "}
                remaining
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
