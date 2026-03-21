/**
 * Shared pace-status visual configuration.
 *
 * Maps each `pace_status` value to its color tokens, background,
 * border class, icon component, and short label.  Used by both
 * `PaceIndicator` and `GoalsPage` to avoid duplicating style definitions.
 */
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface PaceStyleConfig {
  color: string;
  bg: string;
  border: string;
  icon: LucideIcon;
  label: string;
}

export const PACE_STYLES: Record<string, PaceStyleConfig> = {
  on_track: {
    color: "text-accent-green",
    bg: "bg-accent-green/10",
    border: "border-accent-green/20",
    icon: TrendingUp,
    label: "On Track",
  },
  ahead: {
    color: "text-accent-green",
    bg: "bg-accent-green/10",
    border: "border-accent-green/20",
    icon: Zap,
    label: "Ahead",
  },
  behind: {
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
    icon: TrendingDown,
    label: "Behind",
  },
  completed: {
    color: "text-accent-purple",
    bg: "bg-accent-purple/10",
    border: "border-accent-purple/20",
    icon: CheckCircle2,
    label: "Completed",
  },
  overdue: {
    color: "text-accent-red",
    bg: "bg-accent-red/10",
    border: "border-accent-red/20",
    icon: AlertTriangle,
    label: "Overdue",
  },
} as const;
