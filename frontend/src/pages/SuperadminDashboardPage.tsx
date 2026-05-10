/**
 * Superadmin Dashboard — platform-wide analytics for site administrators.
 *
 * Tabs: Overview | Users | Verifications
 * URL-synced: /superadmin?tab=overview|users|verifications&page=N&search=...&status=...
 * Charts use Recharts (consistent with CreatorAnalyticsPage).
 */
import { useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Award,
  BadgeCheck,
  BarChart2,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  GraduationCap,
  HelpCircle,
  Search,
  Shield,
  Star,
  TrendingUp,
  Users,
  Video,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  usePlatformOverview,
  useUserGrowthTrend,
  useActivityTrend,
  useEnrollmentTrend,
  useCourseCreationTrend,
  useLessonTypeDistribution,
  useCourseStatusDistribution,
  useTopCourses,
  useTopCreators,
  useAdminUserList,
  useAdminVerificationList,
  useReviewVerificationMutation,
  useRevokeVerificationMutation,
  type PlatformOverview,
  type TrendPoint,
} from "@/hooks/useSuperadmin";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

// ── Types ─────────────────────────────────────────────────────────────────────

type TabValue = "overview" | "users" | "verifications";
type Accent = "blue" | "green" | "yellow" | "orange" | "purple" | "red" | "muted";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function fmtRelative(iso: string): string {
  const diffDays = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 30) return `${diffDays}d ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

function fillGaps(points: TrendPoint[], days: number): { date: string; value: number }[] {
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

function getPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (current >= total - 3) return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", current - 1, current, current + 1, "…", total];
}

// ── Accent styles ─────────────────────────────────────────────────────────────

const accentStyles: Record<Accent, { border: string; icon: string }> = {
  blue: { border: "border-l-blue-500", icon: "bg-blue-500/10 text-blue-500" },
  green: { border: "border-l-green-500", icon: "bg-green-500/10 text-green-500" },
  yellow: { border: "border-l-yellow-500", icon: "bg-yellow-500/10 text-yellow-500" },
  orange: { border: "border-l-orange-500", icon: "bg-orange-500/10 text-orange-500" },
  purple: { border: "border-l-purple-500", icon: "bg-purple-500/10 text-purple-500" },
  red: { border: "border-l-red-500", icon: "bg-red-500/10 text-red-500" },
  muted: { border: "border-l-border", icon: "bg-muted text-muted-foreground" },
};

// ── Stat Card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.ReactNode;
  accent?: Accent;
}

function StatCard({ label, value, sub, icon, accent = "blue" }: StatCardProps) {
  const { border, icon: iconStyle } = accentStyles[accent];
  return (
    <Card className={`border-l-4 ${border} transition-shadow hover:shadow-md`}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-muted-foreground truncate text-xs font-semibold tracking-wider uppercase">
              {label}
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {typeof value === "number" ? fmt(value) : value}
            </p>
            {sub && <p className="text-muted-foreground mt-1 text-xs">{sub}</p>}
          </div>
          <div className={`shrink-0 rounded-lg p-2.5 ${iconStyle}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Pagination Bar ────────────────────────────────────────────────────────────

function PaginationBar({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const pages = getPageNumbers(page, totalPages);
  return (
    <div className="flex items-center gap-1">
      <Button
        size="icon"
        variant="outline"
        className="size-8"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft size={14} />
      </Button>
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`ell-${i}`} className="text-muted-foreground px-1 text-sm">
            …
          </span>
        ) : (
          <Button
            key={p}
            size="sm"
            variant={p === page ? "default" : "outline"}
            className="size-8 text-xs"
            onClick={() => onChange(p as number)}
          >
            {p}
          </Button>
        ),
      )}
      <Button
        size="icon"
        variant="outline"
        className="size-8"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        <ChevronRight size={14} />
      </Button>
    </div>
  );
}

// ── Trend Chart ───────────────────────────────────────────────────────────────

function TrendChart({
  data,
  color,
  label,
}: {
  data: { date: string; value: number }[];
  color: string;
  label: string;
}) {
  const id = `grad-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.35} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10 }}
          tickFormatter={fmtDate}
          interval="preserveStartEnd"
          axisLine={false}
          tickLine={false}
        />
        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} axisLine={false} tickLine={false} />
        <Tooltip
          formatter={(v: number) => [v, label]}
          labelFormatter={fmtDate}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          fill={`url(#${id})`}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Section Header ────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <p className="text-muted-foreground text-xs font-bold tracking-widest uppercase">{title}</p>
      <div className="bg-border h-px flex-1" />
    </div>
  );
}

// ── Dashboard Banner ──────────────────────────────────────────────────────────

function DashboardBanner() {
  const { data: overview } = usePlatformOverview();
  const kpis = [
    { label: "Users", value: fmt(overview?.total_users ?? 0) },
    { label: "Courses", value: fmt(overview?.total_courses ?? 0) },
    { label: "Enrollments", value: fmt(overview?.total_enrollments ?? 0) },
    {
      label: "Pending",
      value: String(overview?.pending_verification_requests ?? 0),
      highlight: (overview?.pending_verification_requests ?? 0) > 0,
    },
    {
      label: "Avg Rating",
      value: `${(overview?.average_platform_rating ?? 0).toFixed(1)}★`,
    },
  ];
  return (
    <div className="mb-2 rounded-xl border border-slate-700 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-5 text-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-white/10 bg-white/10 p-2.5">
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-base leading-tight font-bold text-white">LearnerVerse Admin</h1>
            <p className="text-xs text-white/50">Superadmin Dashboard</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          {kpis.map(({ label, value, highlight }) => (
            <div key={label} className="text-center">
              <p
                className={`text-lg leading-tight font-bold tabular-nums ${highlight ? "text-orange-400" : "text-white"}`}
              >
                {value}
              </p>
              <p className="text-[10px] tracking-wider text-white/40 uppercase">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab() {
  const [days, setDays] = useState(30);
  const { data: overview, isLoading: loadingOverview } = usePlatformOverview();
  const { data: userTrend } = useUserGrowthTrend(days);
  const { data: activityTrend } = useActivityTrend(days);
  const { data: enrollTrend } = useEnrollmentTrend(days);
  const { data: courseTrend } = useCourseCreationTrend(days);
  const { data: lessonDist } = useLessonTypeDistribution();
  const { data: courseDist } = useCourseStatusDistribution();
  const { data: topCourses } = useTopCourses();
  const { data: topCreators } = useTopCreators();

  if (loadingOverview) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const o = overview as PlatformOverview;
  const userTrendData = fillGaps(userTrend?.points ?? [], days);
  const activityData = fillGaps(activityTrend?.points ?? [], days);
  const enrollData = fillGaps(enrollTrend?.points ?? [], days);
  const courseData = fillGaps(courseTrend?.points ?? [], days);

  const lessonPieData = [
    { name: "Video", value: lessonDist?.video ?? 0, fill: "var(--chart-1)" },
    { name: "Note", value: lessonDist?.note ?? 0, fill: "var(--chart-2)" },
    { name: "Quiz", value: lessonDist?.quiz ?? 0, fill: "var(--chart-3)" },
  ];
  const totalLessons = lessonPieData.reduce((a, b) => a + b.value, 0);

  const courseDistData = [
    { name: "Draft", value: courseDist?.draft ?? 0, fill: "var(--chart-4)" },
    { name: "Ready", value: courseDist?.ready ?? 0, fill: "var(--chart-2)" },
    { name: "Public", value: courseDist?.public ?? 0, fill: "var(--chart-1)" },
  ];

  return (
    <div className="space-y-8">
      {/* Range selector */}
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground mr-1 text-xs font-medium">Range:</span>
        {[7, 14, 30, 90].map((d) => (
          <Button
            key={d}
            size="sm"
            variant={days === d ? "default" : "outline"}
            className="h-7 px-3 text-xs"
            onClick={() => setDays(d)}
          >
            {d}d
          </Button>
        ))}
      </div>

      {/* Users */}
      <div>
        <SectionHeader title="Users" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label="Total Users"
            value={o.total_users}
            icon={<Users size={18} />}
            accent="blue"
          />
          <StatCard
            label="New This Month"
            value={o.new_users_this_month}
            sub={`+${o.new_users_today} today · +${o.new_users_this_week} this week`}
            icon={<TrendingUp size={18} />}
            accent="green"
          />
          <StatCard
            label="Active This Week"
            value={o.active_users_this_week}
            sub={`${o.active_users_today} active today`}
            icon={<BarChart2 size={18} />}
            accent="purple"
          />
          <StatCard
            label="Pro Subscribers"
            value={o.total_pro_users}
            sub={
              o.total_users > 0
                ? `${((o.total_pro_users / o.total_users) * 100).toFixed(1)}% of users`
                : undefined
            }
            icon={<Award size={18} />}
            accent="yellow"
          />
        </div>
      </div>

      {/* Content */}
      <div>
        <SectionHeader title="Content" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label="Total Courses"
            value={o.total_courses}
            sub={`${o.published_courses} published · ${o.draft_courses} drafts`}
            icon={<BookOpen size={18} />}
            accent="blue"
          />
          <StatCard
            label="Total Lessons"
            value={o.total_lessons}
            sub={`${o.video_lessons} video · ${o.note_lessons} notes · ${o.quiz_lessons} quiz`}
            icon={<Video size={18} />}
            accent="purple"
          />
          <StatCard
            label="Verified Creators"
            value={o.total_verified_creators}
            icon={<BadgeCheck size={18} />}
            accent="blue"
          />
          <StatCard
            label="Pending Verifications"
            value={o.pending_verification_requests}
            icon={<Shield size={18} />}
            accent={o.pending_verification_requests > 0 ? "orange" : "muted"}
          />
        </div>
      </div>

      {/* Learning Activity */}
      <div>
        <SectionHeader title="Learning Activity" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label="Total Enrollments"
            value={o.total_enrollments}
            sub={`+${o.enrollments_today} today`}
            icon={<GraduationCap size={18} />}
            accent="green"
          />
          <StatCard
            label="Lessons Completed"
            value={o.total_lessons_completed}
            sub={`+${o.lessons_completed_today} today`}
            icon={<CheckCircle2 size={18} />}
            accent="green"
          />
          <StatCard
            label="Certificates Issued"
            value={o.total_certificates_issued}
            sub={`+${o.certificates_today} today`}
            icon={<Award size={18} />}
            accent="yellow"
          />
          <StatCard
            label="Avg Platform Rating"
            value={o.average_platform_rating.toFixed(2)}
            sub={`from ${fmt(o.total_ratings)} ratings`}
            icon={<Star size={18} />}
            accent="yellow"
          />
        </div>
      </div>

      {/* Trend charts */}
      <div>
        <SectionHeader title={`Trends — Last ${days} Days`} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pt-4 pb-1">
              <CardTitle className="text-sm font-semibold">User Growth</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <TrendChart data={userTrendData} color="var(--chart-1)" label="New Users" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pt-4 pb-1">
              <CardTitle className="text-sm font-semibold">Daily Active Users</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <TrendChart data={activityData} color="var(--chart-2)" label="Active Users" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pt-4 pb-1">
              <CardTitle className="text-sm font-semibold">Enrollments</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <TrendChart data={enrollData} color="var(--chart-3)" label="Enrollments" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pt-4 pb-1">
              <CardTitle className="text-sm font-semibold">Course Creation</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <TrendChart data={courseData} color="var(--chart-4)" label="Courses Created" />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Distributions */}
      <div>
        <SectionHeader title="Distributions" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pt-4 pb-1">
              <CardTitle className="text-sm font-semibold">Lesson Types</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={130} height={130}>
                  <PieChart>
                    <Pie
                      data={lessonPieData}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius={36}
                      outerRadius={56}
                    >
                      {lessonPieData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [v, ""]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-3">
                  {[
                    { name: "Video", icon: <Video size={12} />, ...lessonPieData[0] },
                    { name: "Note", icon: <FileText size={12} />, ...lessonPieData[1] },
                    { name: "Quiz", icon: <HelpCircle size={12} />, ...lessonPieData[2] },
                  ].map((entry) => (
                    <div key={entry.name}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1.5" style={{ color: entry.fill }}>
                          {entry.icon}
                          <span className="text-foreground text-xs font-medium">{entry.name}</span>
                        </div>
                        <span className="text-xs font-semibold tabular-nums">{entry.value}</span>
                      </div>
                      <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width:
                              totalLessons > 0 ? `${(entry.value / totalLessons) * 100}%` : "0%",
                            background: entry.fill,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pt-4 pb-1">
              <CardTitle className="text-sm font-semibold">Course Status</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={courseDistData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {courseDistData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Top performance */}
      <div>
        <SectionHeader title="Top Performance" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pt-4 pb-2">
              <CardTitle className="text-sm font-semibold">Top Courses by Enrollment</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="space-y-3">
                {(topCourses ?? []).slice(0, 8).map((c, i) => (
                  <div key={c.course_id} className="flex items-center gap-3">
                    <span className="text-muted-foreground w-4 text-right font-mono text-xs">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm leading-tight font-medium">{c.title}</p>
                      <p className="text-muted-foreground text-xs">{c.creator_name}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold tabular-nums">{fmt(c.enrollment_count)}</p>
                      <p className="text-muted-foreground text-[10px]">
                        {(c.completion_rate * 100).toFixed(0)}% · ★{c.average_rating.toFixed(1)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pt-4 pb-2">
              <CardTitle className="text-sm font-semibold">Top Creators by Enrollments</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="space-y-3">
                {(topCreators ?? []).slice(0, 8).map((c, i) => (
                  <div key={c.user_id} className="flex items-center gap-3">
                    <span className="text-muted-foreground w-4 text-right font-mono text-xs">
                      {i + 1}
                    </span>
                    <Avatar className="size-7 shrink-0">
                      <AvatarImage src={c.avatar_url ?? undefined} />
                      <AvatarFallback className="text-xs">{c.display_name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1 truncate text-sm leading-tight font-medium">
                        {c.display_name}
                        {c.is_verified_creator && (
                          <BadgeCheck size={11} className="shrink-0 text-blue-500" />
                        )}
                      </p>
                      <p className="text-muted-foreground text-xs">{c.email}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold tabular-nums">{fmt(c.total_enrollments)}</p>
                      <p className="text-muted-foreground text-[10px]">{c.total_courses} courses</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Users Tab ─────────────────────────────────────────────────────────────────

const PER_PAGE = 20;

interface UsersTabProps {
  page: number;
  search: string;
  onPageChange: (p: number) => void;
  onSearchChange: (s: string) => void;
}

function UsersTab({ page, search, onPageChange, onSearchChange }: UsersTabProps) {
  const [inputValue, setInputValue] = useState(search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setInputValue(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSearchChange(v), 400);
  }

  const { data, isLoading } = useAdminUserList(page, PER_PAGE, search);
  const totalPages = data ? Math.ceil(data.total / data.per_page) : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-sm min-w-[200px] flex-1">
          <Search
            size={14}
            className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2"
          />
          <Input
            placeholder="Search by name or email…"
            value={inputValue}
            onChange={handleSearch}
            className="h-9 pl-9"
          />
        </div>
        {data && (
          <p className="text-muted-foreground shrink-0 text-sm">
            {fmt(data.total)} {data.total === 1 ? "user" : "users"}
            {totalPages > 1 && ` · Page ${page} of ${totalPages}`}
          </p>
        )}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/60 border-b">
                {[
                  ["User", "text-left px-4"],
                  ["Pro", "text-center px-3"],
                  ["Verified", "text-center px-3"],
                  ["Courses", "text-right px-3"],
                  ["Enrolled", "text-right px-3"],
                  ["Completed", "text-right px-3"],
                  ["Certs", "text-right px-3"],
                  ["Last Active", "text-right px-3"],
                  ["Joined", "text-right px-4"],
                ].map(([label, cls]) => (
                  <th
                    key={label}
                    className={`text-muted-foreground py-2.5 text-xs font-semibold tracking-wider uppercase ${cls}`}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: PER_PAGE }).map((_, i) => (
                    <tr key={i} className={`border-b ${i % 2 === 1 ? "bg-muted/20" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Skeleton className="size-7 shrink-0 rounded-full" />
                          <div className="space-y-1">
                            <Skeleton className="h-3.5 w-28" />
                            <Skeleton className="h-2.5 w-36" />
                          </div>
                        </div>
                      </td>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-3 py-3">
                          <Skeleton className="h-3 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                : (data?.items ?? []).map((u, i) => (
                    <tr
                      key={u.id}
                      className={`hover:bg-muted/40 border-b transition-colors last:border-0 ${i % 2 === 1 ? "bg-muted/20" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="size-7 shrink-0">
                            <AvatarImage src={u.avatar_url ?? undefined} />
                            <AvatarFallback className="text-xs">{u.display_name[0]}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="max-w-[160px] truncate font-medium">{u.display_name}</p>
                            <p className="text-muted-foreground max-w-[160px] truncate text-xs">
                              {u.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        {u.is_pro && (
                          <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                            Pro
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {u.is_verified_creator && (
                          <BadgeCheck size={15} className="mx-auto text-blue-500" />
                        )}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">{u.courses_created}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{u.courses_enrolled}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{u.lessons_completed}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{u.certificates_earned}</td>
                      <td className="text-muted-foreground px-3 py-3 text-right text-xs">
                        {u.last_active ? fmtRelative(u.last_active) : "—"}
                      </td>
                      <td className="text-muted-foreground px-4 py-3 text-right text-xs">
                        {new Date(u.joined_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </Card>

      {data && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-xs">
            Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, data.total)} of{" "}
            {data.total}
          </p>
          <PaginationBar page={page} totalPages={totalPages} onChange={onPageChange} />
        </div>
      )}
    </div>
  );
}

// ── Verifications Tab ─────────────────────────────────────────────────────────

const STATUS_FILTERS = [null, "pending", "approved", "rejected", "withdrawn", "revoked"] as const;

const statusConfig: Record<
  string,
  {
    label: string;
    border: string;
    badge: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  pending: { label: "Pending", border: "border-l-orange-500", badge: "secondary" },
  approved: { label: "Approved", border: "border-l-green-500", badge: "default" },
  rejected: { label: "Rejected", border: "border-l-red-500", badge: "destructive" },
  withdrawn: { label: "Withdrawn", border: "border-l-slate-400", badge: "outline" },
  revoked: { label: "Revoked", border: "border-l-purple-500", badge: "outline" },
};

const VERIF_PER_PAGE = 20;

interface VerificationsTabProps {
  statusFilter: string | null;
  page: number;
  onStatusChange: (s: string | null) => void;
  onPageChange: (p: number) => void;
}

function VerificationsTab({
  statusFilter,
  page,
  onStatusChange,
  onPageChange,
}: VerificationsTabProps) {
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">("approve");
  const [adminNote, setAdminNote] = useState("");
  const [revokingUserId, setRevokingUserId] = useState<string | null>(null);
  const [revokeNote, setRevokeNote] = useState("");

  const { data, isLoading } = useAdminVerificationList(statusFilter, page, VERIF_PER_PAGE);
  const reviewMutation = useReviewVerificationMutation();
  const revokeMutation = useRevokeVerificationMutation();

  const reviewingItem = data?.items.find((r) => r.id === reviewingId);
  const revokingItem = data?.items.find((r) => r.user_id === revokingUserId);
  const totalPages = data ? Math.ceil(data.total / VERIF_PER_PAGE) : 0;

  function openReview(id: string, action: "approve" | "reject") {
    setReviewingId(id);
    setReviewAction(action);
    setAdminNote("");
  }

  async function submitReview() {
    if (!reviewingId) return;
    await reviewMutation.mutateAsync({
      requestId: reviewingId,
      action: reviewAction,
      note: adminNote || undefined,
    });
    setReviewingId(null);
  }

  return (
    <div className="space-y-4">
      {/* Filter pills */}
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((s) => (
          <Button
            key={s ?? "all"}
            size="sm"
            variant={statusFilter === s ? "default" : "outline"}
            className="h-8 text-xs"
            onClick={() => {
              onStatusChange(s);
              onPageChange(1);
            }}
          >
            {s === null ? "All" : (statusConfig[s]?.label ?? s)}
          </Button>
        ))}
        {data && (
          <span className="text-muted-foreground ml-1 text-sm">
            {data.total} {data.total === 1 ? "request" : "requests"}
          </span>
        )}
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="border-l-border border-l-4">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="size-9 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (data?.items ?? []).length === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center">
            <Shield size={32} className="text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground text-sm font-medium">No verification requests</p>
            <p className="text-muted-foreground mt-1 text-xs">
              {statusFilter
                ? `No ${statusFilter} requests found.`
                : "No requests have been submitted yet."}
            </p>
          </div>
        ) : (
          (data?.items ?? []).map((r) => {
            const sc = statusConfig[r.status] ?? {
              label: r.status,
              border: "border-l-border",
              badge: "outline" as const,
            };
            return (
              <Card
                key={r.id}
                className={`border-l-4 ${sc.border} transition-shadow hover:shadow-sm`}
              >
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="size-9 shrink-0">
                      <AvatarImage src={r.user_avatar_url ?? undefined} />
                      <AvatarFallback className="text-xs">{r.user_display_name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold">{r.user_display_name}</p>
                            {r.user_is_verified_creator && (
                              <BadgeCheck size={13} className="shrink-0 text-blue-500" />
                            )}
                          </div>
                          <p className="text-muted-foreground text-xs">{r.user_email}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge variant={sc.badge} className="text-xs">
                            {sc.label}
                          </Badge>
                          <span className="text-muted-foreground text-xs">
                            {new Date(r.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <p className="text-muted-foreground mt-2 line-clamp-3 text-sm leading-relaxed">
                        {r.message}
                      </p>

                      {r.admin_note && (
                        <div className="mt-2 rounded border-l-2 border-orange-400 bg-orange-500/5 py-1 pl-2 text-xs">
                          <span className="font-medium text-orange-600">Admin note:</span>{" "}
                          <span className="text-muted-foreground">{r.admin_note}</span>
                        </div>
                      )}

                      {r.reviewed_at && (
                        <p className="text-muted-foreground mt-1.5 text-[10px]">
                          Reviewed {new Date(r.reviewed_at).toLocaleDateString()}
                        </p>
                      )}

                      {r.status === "pending" && (
                        <div className="mt-3 flex gap-2 border-t pt-3">
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => openReview(r.id, "approve")}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => openReview(r.id, "reject")}
                          >
                            Reject
                          </Button>
                        </div>
                      )}

                      {r.status === "approved" && r.user_is_verified_creator && (
                        <div className="mt-3 flex gap-2 border-t pt-3">
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 text-xs"
                            onClick={() => {
                              setRevokingUserId(r.user_id);
                              setRevokeNote("");
                            }}
                          >
                            Revoke Verification
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {data && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-xs">
            Showing {(page - 1) * VERIF_PER_PAGE + 1}–{Math.min(page * VERIF_PER_PAGE, data.total)}{" "}
            of {data.total}
          </p>
          <PaginationBar page={page} totalPages={totalPages} onChange={onPageChange} />
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={!!reviewingId} onOpenChange={(open) => !open && setReviewingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === "approve" ? "Approve" : "Reject"} Verification
            </DialogTitle>
          </DialogHeader>
          {reviewingItem && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="font-semibold">{reviewingItem.user_display_name}</p>
                <p className="text-muted-foreground mt-0.5 text-xs">{reviewingItem.user_email}</p>
                <Separator className="my-2" />
                <p className="text-muted-foreground leading-relaxed">{reviewingItem.message}</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin-note" className="text-sm">
                  {reviewAction === "reject"
                    ? "Rejection reason (required)"
                    : "Admin note (optional)"}
                </Label>
                <Textarea
                  id="admin-note"
                  placeholder={
                    reviewAction === "reject"
                      ? "Why is this being rejected?"
                      : "Optional note for the creator…"
                  }
                  value={adminNote}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setAdminNote(e.target.value)
                  }
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewingId(null)}>
              Cancel
            </Button>
            <Button
              onClick={submitReview}
              disabled={
                reviewMutation.isPending || (reviewAction === "reject" && !adminNote.trim())
              }
              variant={reviewAction === "reject" ? "destructive" : "default"}
            >
              {reviewMutation.isPending
                ? "Saving…"
                : reviewAction === "approve"
                  ? "Approve"
                  : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Dialog */}
      <Dialog open={!!revokingUserId} onOpenChange={(open) => !open && setRevokingUserId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Verified Creator Status</DialogTitle>
          </DialogHeader>
          {revokingItem && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="font-semibold">{revokingItem.user_display_name}</p>
                <p className="text-muted-foreground mt-0.5 text-xs">{revokingItem.user_email}</p>
              </div>
              <p className="text-muted-foreground text-sm">
                This removes the Verified Creator badge. The user will be notified and may re-apply.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="revoke-note" className="text-sm">
                  Reason (optional)
                </Label>
                <Textarea
                  id="revoke-note"
                  placeholder="Explain why the verification is being revoked…"
                  value={revokeNote}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setRevokeNote(e.target.value)
                  }
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokingUserId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={revokeMutation.isPending}
              onClick={async () => {
                if (!revokingUserId) return;
                await revokeMutation.mutateAsync({
                  userId: revokingUserId,
                  note: revokeNote || undefined,
                });
                setRevokingUserId(null);
              }}
            >
              {revokeMutation.isPending ? "Revoking…" : "Revoke Verification"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function SuperadminDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const tab = (searchParams.get("tab") as TabValue) ?? "overview";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const search = searchParams.get("search") ?? "";
  const verStatus = searchParams.get("status") ?? null;

  function setTab(t: TabValue) {
    // Switching tabs resets all per-tab state
    setSearchParams({ tab: t }, { replace: true });
  }

  function setPage(p: number) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("page", String(p));
        return next;
      },
      { replace: true },
    );
  }

  function setSearch(s: string) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (s) next.set("search", s);
        else next.delete("search");
        next.set("page", "1");
        return next;
      },
      { replace: true },
    );
  }

  function setVerStatus(s: string | null) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (s) next.set("status", s);
        else next.delete("status");
        next.set("page", "1");
        return next;
      },
      { replace: true },
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-6">
      <DashboardBanner />

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <TabsList className="h-9">
          <TabsTrigger value="overview" className="text-xs">
            Overview
          </TabsTrigger>
          <TabsTrigger value="users" className="text-xs">
            Users
          </TabsTrigger>
          <TabsTrigger value="verifications" className="text-xs">
            Verifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="users" className="mt-6">
          <UsersTab page={page} search={search} onPageChange={setPage} onSearchChange={setSearch} />
        </TabsContent>
        <TabsContent value="verifications" className="mt-6">
          <VerificationsTab
            statusFilter={verStatus}
            page={page}
            onStatusChange={setVerStatus}
            onPageChange={setPage}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
