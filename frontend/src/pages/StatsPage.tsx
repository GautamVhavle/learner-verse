/**
 * Learning statistics page - overview cards, weekly activity bar chart,
 * and a responsive activity heatmap.
 */
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { StatsCards } from "@/components/stats/StatsCards";
import { ActivityHeatmap } from "@/components/stats/ActivityHeatmap";
import { useStatsOverviewQuery, useActivityQuery } from "@/hooks/useStats";

const chartConfig: ChartConfig = {
  lessons: {
    label: "Lessons",
    color: "var(--chart-1)",
  },
};

/** Aggregate daily activity into per-week buckets for the bar chart. */
function aggregateWeekly(
  days: { date: string; count: number }[],
): { week: string; lessons: number }[] {
  const weekMap = new Map<string, number>();

  for (const d of days) {
    const dt = new Date(d.date + "T00:00:00");
    // ISO week start (Monday)
    const dayOfWeek = dt.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(dt);
    monday.setDate(dt.getDate() + diff);
    const key = monday.toISOString().slice(0, 10);
    weekMap.set(key, (weekMap.get(key) ?? 0) + d.count);
  }

  // Sort and take last 12 weeks
  return Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([week, lessons]) => {
      const dt = new Date(week + "T00:00:00");
      const label = dt.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      return { week: label, lessons };
    });
}

export default function StatsPage() {
  const { data: stats, isLoading: statsLoading } = useStatsOverviewQuery();
  const { data: activity, isLoading: activityLoading } = useActivityQuery(12);

  const weeklyData = useMemo(() => (activity ? aggregateWeekly(activity.days) : []), [activity]);

  if (statsLoading || activityLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-text-primary text-2xl font-bold tracking-tight">Learning Stats</h1>
          <p className="text-text-secondary mt-1 text-sm">Loading your activity…</p>
        </div>
        {/* Skeleton cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-muted h-28 animate-pulse rounded-xl" />
          ))}
        </div>
        {/* Skeleton chart */}
        <div className="bg-muted h-72 animate-pulse rounded-xl" />
        {/* Skeleton heatmap */}
        <div className="bg-muted h-48 animate-pulse rounded-xl" />
      </div>
    );
  }

  if (!stats || !activity) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-text-primary text-2xl font-bold tracking-tight">Learning Stats</h1>
          <p className="text-text-secondary mt-1 text-sm">Your learning activity and streaks.</p>
        </div>
        <div className="border-border-default flex min-h-[40vh] items-center justify-center rounded-xl border border-dashed py-16">
          <div className="flex max-w-sm flex-col items-center text-center">
            <div className="bg-accent-amber/10 mb-4 flex size-14 items-center justify-center rounded-full">
              <BarChart3 className="text-accent-amber/50 size-7" />
            </div>
            <h3 className="text-text-primary text-base font-medium">No stats yet</h3>
            <p className="text-text-secondary mt-1 text-sm">
              Complete some lessons to see your learning stats and activity heatmap.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-text-primary text-2xl font-bold tracking-tight">Learning Stats</h1>
        <p className="text-text-secondary mt-1 text-sm">
          Track your progress and build consistency.
        </p>
      </div>

      {/* Stat cards */}
      <StatsCards stats={stats} />

      {/* Weekly activity bar chart */}
      {weeklyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weekly Activity</CardTitle>
            <CardDescription>Lessons completed per week</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-56 w-full">
              <BarChart accessibilityLayer data={weeklyData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="week"
                  tickLine={false}
                  tickMargin={8}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                  tick={{ fontSize: 11 }}
                />
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="lessons" fill="var(--color-lessons)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Activity heatmap */}
      <ActivityHeatmap days={activity.days} totalLessons={activity.total_lessons} />
    </div>
  );
}
