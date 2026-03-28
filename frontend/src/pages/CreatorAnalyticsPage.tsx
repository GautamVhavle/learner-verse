/**
 * Creator Analytics page — overview stats, enrollment/completion trends,
 * rating distribution, top courses, and per-course drill-down table.
 */
import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import {
  BookOpen,
  ChevronRight,
  GraduationCap,
  LineChart as LineChartIcon,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { useModeAwareNavigate } from "@/hooks/useModeAwareNavigate";
import {
  useAnalyticsOverviewQuery,
  useCourseAnalyticsQuery,
  useTopCoursesQuery,
} from "@/hooks/useAnalytics";
import type { AnalyticsOverview, CourseAnalytics } from "@/types/analytics";

// ── Chart configs ───────────────────────────────────────────

const enrollmentConfig: ChartConfig = {
  enrollments: { label: "Enrollments", color: "var(--chart-1)" },
};

const completionConfig: ChartConfig = {
  completions: { label: "Completions", color: "var(--chart-2)" },
};

const ratingColors = [
  "var(--chart-5)", // 1 star
  "var(--chart-4)", // 2 stars
  "var(--chart-3)", // 3 stars
  "var(--chart-2)", // 4 stars
  "var(--chart-1)", // 5 stars
];

// ── Helpers ─────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function fillTrendGaps(
  points: { date: string; count: number }[],
  days: number,
): { date: string; value: number }[] {
  const map = new Map(points.map((p) => [p.date, p.count]));
  const result: { date: string; value: number }[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key, value: map.get(key) ?? 0 });
  }
  return result;
}

// ── Stat Card ───────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ElementType;
  accent: string;
  iconBg: string;
}

function StatCard({ label, value, sub, icon: Icon, accent, iconBg }: StatCardProps) {
  return (
    <Card size="sm" className="relative overflow-hidden">
      <CardContent className="flex flex-col gap-3 px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
            <Icon className={`size-4 ${accent}`} />
          </div>
          <span className="text-xs font-medium text-text-secondary">{label}</span>
        </div>
        <div>
          <span className="text-2xl font-bold tracking-tight text-text-primary">{value}</span>
          <p className="mt-0.5 text-xs text-text-secondary">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Star Rating Display ─────────────────────────────────────

function StarDisplay({ rating, className }: { rating: number; className?: string }) {
  return (
    <div className={`flex items-center gap-0.5 ${className ?? ""}`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`size-3.5 ${s <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

// ── Course Row ──────────────────────────────────────────────

function CourseRow({
  course,
  onNavigate,
}: {
  course: CourseAnalytics;
  onNavigate: (id: string) => void;
}) {
  return (
    <button
      onClick={() => onNavigate(course.course_id)}
      className="flex w-full items-center gap-3 rounded-lg border border-border-default bg-bg-primary px-4 py-3 text-left transition-colors hover:bg-bg-secondary"
    >
      {/* Thumbnail */}
      <div className="size-10 shrink-0 overflow-hidden rounded-md bg-muted">
        {course.thumbnail_url ? (
          <img
            src={course.thumbnail_url}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <BookOpen className="size-4 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-primary">{course.title}</p>
        <div className="mt-0.5 flex items-center gap-3 text-xs text-text-secondary">
          <span>{course.enrollment_count} enrolled</span>
          <span>{course.completion_rate}% completion</span>
          {course.rating_count > 0 && (
            <span className="flex items-center gap-0.5">
              <Star className="size-3 fill-amber-400 text-amber-400" />
              {course.average_rating}
            </span>
          )}
        </div>
      </div>

      {/* Status badge */}
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
          course.is_public
            ? "bg-emerald-500/10 text-emerald-500"
            : course.status === "ready"
              ? "bg-blue-500/10 text-blue-500"
              : "bg-muted text-muted-foreground"
        }`}
      >
        {course.is_public ? "Public" : course.status === "ready" ? "Ready" : "Draft"}
      </span>

      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

// ── Main Page ───────────────────────────────────────────────

export default function CreatorAnalyticsPage() {
  const navigate = useModeAwareNavigate();
  const [trendDays] = useState(30);
  const [sort, setSort] = useState<"enrollments" | "completions" | "rating" | "newest">("enrollments");

  const { data: overview, isLoading: overviewLoading } = useAnalyticsOverviewQuery(trendDays);
  const { data: courses, isLoading: coursesLoading } = useCourseAnalyticsQuery({ sort, per_page: 50 });
  const { data: topCourses } = useTopCoursesQuery(5);

  if (overviewLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Creator Analytics</h1>
          <p className="mt-1 text-sm text-text-secondary">Loading your analytics…</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Creator Analytics</h1>
          <p className="mt-1 text-sm text-text-secondary">Track your course performance.</p>
        </div>
        <div className="flex min-h-[40vh] items-center justify-center rounded-xl border border-dashed border-border-default py-16">
          <div className="flex max-w-sm flex-col items-center text-center">
            <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-accent-amber/10">
              <LineChartIcon className="size-7 text-accent-amber/50" />
            </div>
            <h3 className="text-base font-medium text-text-primary">No analytics yet</h3>
            <p className="mt-1 text-sm text-text-secondary">
              Create and publish courses to start seeing analytics.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const enrollmentTrend = fillTrendGaps(overview.enrollment_trend, trendDays);
  const completionTrend = fillTrendGaps(overview.completion_trend, trendDays);
  const ratingData = overview.rating_distribution.map((b) => ({
    name: `${b.stars}★`,
    value: b.count,
    stars: b.stars,
  }));
  const hasRatings = overview.total_ratings > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Creator Analytics</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Track enrollments, completions, and ratings across your courses.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-3 xs:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Courses"
          value={overview.total_courses}
          sub={`${overview.published_courses} published · ${overview.draft_courses} draft`}
          icon={BookOpen}
          accent="text-blue-500"
          iconBg="bg-blue-500/10"
        />
        <StatCard
          label="Total Enrollments"
          value={overview.total_enrollments}
          sub={`Across ${overview.published_courses} courses`}
          icon={Users}
          accent="text-emerald-500"
          iconBg="bg-emerald-500/10"
        />
        <StatCard
          label="Completions"
          value={overview.total_completions}
          sub={overview.total_enrollments > 0
            ? `${Math.round((overview.total_completions / overview.total_enrollments) * 100)}% completion rate`
            : "No enrollments yet"
          }
          icon={GraduationCap}
          accent="text-violet-500"
          iconBg="bg-violet-500/10"
        />
        <StatCard
          label="Average Rating"
          value={hasRatings ? `${overview.average_rating} ★` : "—"}
          sub={hasRatings ? `${overview.total_ratings} ratings` : "No ratings yet"}
          icon={Star}
          accent="text-amber-500"
          iconBg="bg-amber-500/10"
        />
      </div>

      {/* Trend Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Enrollment Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Enrollment Trend</CardTitle>
            <CardDescription>New enrollments over the last {trendDays} days</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={enrollmentConfig} className="h-48 w-full">
              <AreaChart data={enrollmentTrend}>
                <defs>
                  <linearGradient id="enrollGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10 }}
                  tickFormatter={formatDate}
                  interval="preserveStartEnd"
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                  tick={{ fontSize: 10 }}
                />
                <ChartTooltip
                  content={<ChartTooltipContent hideLabel />}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--chart-1)"
                  fill="url(#enrollGrad)"
                  strokeWidth={2}
                  name="Enrollments"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Completion Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Completion Trend</CardTitle>
            <CardDescription>Course completions over the last {trendDays} days</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={completionConfig} className="h-48 w-full">
              <AreaChart data={completionTrend}>
                <defs>
                  <linearGradient id="compGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10 }}
                  tickFormatter={formatDate}
                  interval="preserveStartEnd"
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                  tick={{ fontSize: 10 }}
                />
                <ChartTooltip
                  content={<ChartTooltipContent hideLabel />}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--chart-2)"
                  fill="url(#compGrad)"
                  strokeWidth={2}
                  name="Completions"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Rating Distribution + Top Courses */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Rating Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rating Distribution</CardTitle>
            <CardDescription>
              {hasRatings
                ? `${overview.average_rating} average from ${overview.total_ratings} ratings`
                : "No ratings yet"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasRatings ? (
              <div className="flex items-center gap-6">
                {/* Pie chart */}
                <div className="size-36 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={ratingData}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={60}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {ratingData.map((entry, i) => (
                          <Cell key={entry.name} fill={ratingColors[i]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Bars */}
                <div className="flex flex-1 flex-col gap-1.5">
                  {[5, 4, 3, 2, 1].map((stars) => {
                    const bucket = overview.rating_distribution.find((b) => b.stars === stars);
                    const count = bucket?.count ?? 0;
                    const pct = overview.total_ratings > 0 ? (count / overview.total_ratings) * 100 : 0;
                    return (
                      <div key={stars} className="flex items-center gap-2">
                        <span className="w-8 text-right text-xs text-text-secondary">{stars}★</span>
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: ratingColors[stars - 1],
                            }}
                          />
                        </div>
                        <span className="w-8 text-xs text-text-secondary">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex h-36 items-center justify-center text-sm text-text-secondary">
                Publish courses and collect ratings to see distribution.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Courses */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Courses</CardTitle>
            <CardDescription>By enrollment count</CardDescription>
          </CardHeader>
          <CardContent>
            {topCourses && topCourses.length > 0 ? (
              <div className="space-y-2">
                {topCourses.map((tc, i) => (
                  <button
                    key={tc.course_id}
                    onClick={() => navigate(`/analytics/${tc.course_id}`)}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-bg-secondary"
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold text-text-secondary">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text-primary">{tc.title}</p>
                      <div className="flex items-center gap-2 text-xs text-text-secondary">
                        <span>{tc.enrollment_count} enrolled</span>
                        {tc.rating_count > 0 && (
                          <span className="flex items-center gap-0.5">
                            <Star className="size-3 fill-amber-400 text-amber-400" />
                            {tc.average_rating}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex h-36 items-center justify-center text-sm text-text-secondary">
                No courses yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Course List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">All Courses</CardTitle>
            <CardDescription>
              {courses ? `${courses.total} courses` : "Loading…"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            {(["enrollments", "completions", "rating", "newest"] as const).map((s) => (
              <Button
                key={s}
                variant={sort === s ? "default" : "ghost"}
                size="sm"
                onClick={() => setSort(s)}
                className="text-xs capitalize"
              >
                {s}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {coursesLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : courses && courses.items.length > 0 ? (
            <div className="space-y-2">
              {courses.items.map((c) => (
                <CourseRow
                  key={c.course_id}
                  course={c}
                  onNavigate={(id) => navigate(`/analytics/${id}`)}
                />
              ))}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-sm text-text-secondary">
              No courses found. Create a course to see analytics.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
