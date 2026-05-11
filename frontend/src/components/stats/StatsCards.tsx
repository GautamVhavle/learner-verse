/**
 * Summary stat cards - streak, lessons, courses, and active days.
 *
 * Uses shadcn Card for consistent styling. Responsive grid:
 * 1 col on mobile, 2 on sm, 3 on md, 5 on lg+.
 */
import { BookOpen, CalendarDays, Flame, GraduationCap, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { StatsOverviewResponse } from "@/types/stats";

interface StatsCardsProps {
  stats: StatsOverviewResponse;
}

interface StatCardDef {
  key: string;
  label: string;
  icon: typeof Flame;
  accent: string;
  iconBg: string;
  getValue: (s: StatsOverviewResponse) => string;
  getSuffix: (s: StatsOverviewResponse) => string;
  getSub: (s: StatsOverviewResponse) => string;
}

const cards: StatCardDef[] = [
  {
    key: "current_streak",
    label: "Current Streak",
    icon: Flame,
    accent: "text-orange-500",
    iconBg: "bg-orange-500/10",
    getValue: (s) => s.current_streak.toString(),
    getSuffix: (s) => (s.current_streak === 1 ? " day" : " days"),
    getSub: (s) => (s.current_streak > 0 ? "Keep it going!" : "Start today"),
  },
  {
    key: "longest_streak",
    label: "Longest Streak",
    icon: Trophy,
    accent: "text-amber-500",
    iconBg: "bg-amber-500/10",
    getValue: (s) => s.longest_streak.toString(),
    getSuffix: (s) => (s.longest_streak === 1 ? " day" : " days"),
    getSub: () => "Personal best",
  },
  {
    key: "lessons",
    label: "Lessons Completed",
    icon: BookOpen,
    accent: "text-blue-500",
    iconBg: "bg-blue-500/10",
    getValue: (s) => s.total_lessons_completed.toString(),
    getSuffix: () => "",
    getSub: () => "Total finished",
  },
  {
    key: "courses",
    label: "Courses Completed",
    icon: GraduationCap,
    accent: "text-emerald-500",
    iconBg: "bg-emerald-500/10",
    getValue: (s) => s.total_courses_completed.toString(),
    getSuffix: () => "",
    getSub: () => "Certificates earned",
  },
  {
    key: "active_days",
    label: "Active Days",
    icon: CalendarDays,
    accent: "text-violet-500",
    iconBg: "bg-violet-500/10",
    getValue: (s) => s.total_active_days.toString(),
    getSuffix: () => "",
    getSub: (s) => (s.most_active_day ? `Most active: ${s.most_active_day}` : "Start learning"),
  },
];

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.key} size="sm" className="relative overflow-hidden">
            <CardContent className="flex flex-col gap-3 px-4 py-4">
              {/* Icon + Label row */}
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${card.iconBg}`}
                >
                  <Icon className={`size-4 ${card.accent}`} />
                </div>
                <span className="text-muted-foreground text-xs font-medium">{card.label}</span>
              </div>

              {/* Value */}
              <div>
                <p className="text-foreground text-3xl font-bold tracking-tight">
                  {card.getValue(stats)}
                  <span className="text-muted-foreground text-base font-medium">
                    {card.getSuffix(stats)}
                  </span>
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs">{card.getSub(stats)}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
