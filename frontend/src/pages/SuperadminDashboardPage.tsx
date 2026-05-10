/**
 * Superadmin Dashboard — platform-wide analytics for site administrators.
 *
 * Tabs: Overview | Users | Verifications
 * Charts use Recharts (consistent with CreatorAnalyticsPage).
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
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Award,
  BadgeCheck,
  BookOpen,
  CheckCircle2,
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

// ── Stat Card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.ReactNode;
  color?: string;
}

function StatCard({ label, value, sub, icon, color = "text-primary" }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-muted-foreground text-sm">{label}</p>
            <p className="text-2xl font-bold">{typeof value === "number" ? fmt(value) : value}</p>
            {sub && <p className="text-muted-foreground mt-0.5 text-xs">{sub}</p>}
          </div>
          <div className={`mt-1 ${color}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Trend Chart ───────────────────────────────────────────────────────────────

interface TrendChartProps {
  data: { date: string; value: number }[];
  color: string;
  label: string;
}

function TrendChart({ data, color, label }: TrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={120}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
        <defs>
          <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.4} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10 }}
          tickFormatter={fmtDate}
          interval="preserveStartEnd"
        />
        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
        <Tooltip
          formatter={(v: number) => [v, label]}
          labelFormatter={fmtDate}
          contentStyle={{ fontSize: 12 }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          fill={`url(#grad-${color.replace("#", "")})`}
          strokeWidth={2}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
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
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
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

  const courseDistData = [
    { name: "Draft", value: courseDist?.draft ?? 0, fill: "var(--chart-4)" },
    { name: "Ready", value: courseDist?.ready ?? 0, fill: "var(--chart-1)" },
  ];

  return (
    <div className="space-y-6">
      {/* Day range selector */}
      <div className="flex items-center gap-2">
        {[7, 14, 30, 90].map((d) => (
          <Button
            key={d}
            size="sm"
            variant={days === d ? "default" : "outline"}
            onClick={() => setDays(d)}
          >
            {d}d
          </Button>
        ))}
      </div>

      {/* User stats */}
      <div>
        <h3 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wide uppercase">
          Users
        </h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Total Users" value={o.total_users} icon={<Users size={20} />} />
          <StatCard
            label="New This Month"
            value={o.new_users_this_month}
            sub={`+${o.new_users_today} today`}
            icon={<TrendingUp size={20} />}
            color="text-green-500"
          />
          <StatCard
            label="Active This Week"
            value={o.active_users_this_week}
            sub={`${o.active_users_today} today`}
            icon={<TrendingUp size={20} />}
            color="text-blue-500"
          />
          <StatCard
            label="Pro Users"
            value={o.total_pro_users}
            icon={<Award size={20} />}
            color="text-yellow-500"
          />
        </div>
      </div>

      {/* Course stats */}
      <div>
        <h3 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wide uppercase">
          Content
        </h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard
            label="Total Courses"
            value={o.total_courses}
            sub={`${o.published_courses} published`}
            icon={<BookOpen size={20} />}
          />
          <StatCard label="Total Lessons" value={o.total_lessons} icon={<Video size={20} />} />
          <StatCard
            label="Verified Creators"
            value={o.total_verified_creators}
            icon={<BadgeCheck size={20} />}
            color="text-blue-500"
          />
          <StatCard
            label="Pending Verif."
            value={o.pending_verification_requests}
            icon={<Shield size={20} />}
            color={
              o.pending_verification_requests > 0 ? "text-orange-500" : "text-muted-foreground"
            }
          />
        </div>
      </div>

      {/* Learning stats */}
      <div>
        <h3 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wide uppercase">
          Learning Activity
        </h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard
            label="Total Enrollments"
            value={o.total_enrollments}
            sub={`+${o.enrollments_today} today`}
            icon={<GraduationCap size={20} />}
          />
          <StatCard
            label="Lessons Completed"
            value={o.total_lessons_completed}
            sub={`+${o.lessons_completed_today} today`}
            icon={<CheckCircle2 size={20} />}
            color="text-green-500"
          />
          <StatCard
            label="Certificates"
            value={o.total_certificates_issued}
            sub={`+${o.certificates_today} today`}
            icon={<Award size={20} />}
            color="text-yellow-500"
          />
          <StatCard
            label="Avg Platform Rating"
            value={o.average_platform_rating.toFixed(1)}
            sub={`from ${fmt(o.total_ratings)} ratings`}
            icon={<Star size={20} />}
            color="text-yellow-400"
          />
        </div>
      </div>

      {/* Trend charts */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">User Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart data={userTrendData} color="var(--chart-1)" label="New Users" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Daily Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart data={activityData} color="var(--chart-2)" label="Active Users" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Enrollments</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart data={enrollData} color="var(--chart-3)" label="Enrollments" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Course Creation</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart data={courseData} color="var(--chart-4)" label="Courses Created" />
          </CardContent>
        </Card>
      </div>

      {/* Distributions */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Lesson Types</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            <ResponsiveContainer width={120} height={120}>
              <PieChart>
                <Pie data={lessonPieData} dataKey="value" cx="50%" cy="50%" outerRadius={50}>
                  {lessonPieData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [v, ""]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Video size={14} className="text-[var(--chart-1)]" />
                <span>Video: {lessonDist?.video ?? 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-[var(--chart-2)]" />
                <span>Note: {lessonDist?.note ?? 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <HelpCircle size={14} className="text-[var(--chart-3)]" />
                <span>Quiz: {lessonDist?.quiz ?? 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Course Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={courseDistData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
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

      {/* Top courses */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Top Courses by Enrollment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(topCourses ?? []).slice(0, 8).map((c, i) => (
              <div key={c.course_id} className="flex items-center gap-3">
                <span className="text-muted-foreground w-5 text-right text-sm">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.title}</p>
                  <p className="text-muted-foreground text-xs">{c.creator_name}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold">{fmt(c.enrollment_count)}</p>
                  <p className="text-muted-foreground text-xs">
                    {(c.completion_rate * 100).toFixed(0)}% completed ·{" "}
                    <Star size={10} className="inline" /> {c.average_rating.toFixed(1)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top creators */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Top Creators by Enrollments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(topCreators ?? []).slice(0, 8).map((c, i) => (
              <div key={c.user_id} className="flex items-center gap-3">
                <span className="text-muted-foreground w-5 text-right text-sm">{i + 1}</span>
                <Avatar className="size-8">
                  <AvatarImage src={c.avatar_url ?? undefined} />
                  <AvatarFallback>{c.display_name[0]}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 truncate text-sm font-medium">
                    {c.display_name}
                    {c.is_verified_creator && (
                      <BadgeCheck size={12} className="shrink-0 text-blue-500" />
                    )}
                  </p>
                  <p className="text-muted-foreground text-xs">{c.email}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold">{fmt(c.total_enrollments)}</p>
                  <p className="text-muted-foreground text-xs">{c.total_courses} courses</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Users Tab ─────────────────────────────────────────────────────────────────

function UsersTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const { data, isLoading } = useAdminUserList(page, 25, debouncedSearch);

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    clearTimeout((window as unknown as { _searchTimer?: number })._searchTimer);
    (window as unknown as { _searchTimer?: number })._searchTimer = window.setTimeout(() => {
      setDebouncedSearch(e.target.value);
      setPage(1);
    }, 400);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search
            size={16}
            className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2"
          />
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={handleSearch}
            className="pl-9"
          />
        </div>
        {data && <span className="text-muted-foreground text-sm">{fmt(data.total)} users</span>}
      </div>

      <div className="overflow-hidden rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="px-4 py-2 text-left font-medium">User</th>
              <th className="px-3 py-2 text-center font-medium">Pro</th>
              <th className="px-3 py-2 text-center font-medium">Verified</th>
              <th className="px-3 py-2 text-right font-medium">Courses</th>
              <th className="px-3 py-2 text-right font-medium">Enrolled</th>
              <th className="px-3 py-2 text-right font-medium">Completed</th>
              <th className="px-3 py-2 text-right font-medium">Certs</th>
              <th className="px-3 py-2 text-right font-medium">Last Active</th>
              <th className="px-4 py-2 text-right font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    <td colSpan={9} className="px-4 py-3">
                      <Skeleton className="h-5 w-full" />
                    </td>
                  </tr>
                ))
              : (data?.items ?? []).map((u) => (
                  <tr key={u.id} className="hover:bg-muted/30 border-b last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="size-7">
                          <AvatarImage src={u.avatar_url ?? undefined} />
                          <AvatarFallback>{u.display_name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{u.display_name}</p>
                          <p className="text-muted-foreground text-xs">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {u.is_pro && (
                        <Badge variant="secondary" className="text-xs">
                          Pro
                        </Badge>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {u.is_verified_creator && (
                        <BadgeCheck size={16} className="mx-auto text-blue-500" />
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">{u.courses_created}</td>
                    <td className="px-3 py-3 text-right">{u.courses_enrolled}</td>
                    <td className="px-3 py-3 text-right">{u.lessons_completed}</td>
                    <td className="px-3 py-3 text-right">{u.certificates_earned}</td>
                    <td className="text-muted-foreground px-3 py-3 text-right">
                      {u.last_active ? new Date(u.last_active).toLocaleDateString() : "—"}
                    </td>
                    <td className="text-muted-foreground px-4 py-3 text-right">
                      {new Date(u.joined_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.total > 25 && (
        <div className="flex items-center justify-between">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-muted-foreground text-sm">
            Page {data.page} of {Math.ceil(data.total / data.per_page)}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= Math.ceil(data.total / data.per_page)}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Verifications Tab ─────────────────────────────────────────────────────────

function VerificationsTab() {
  const [statusFilter, setStatusFilter] = useState<string | null>("pending");
  const [page, setPage] = useState(1);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">("approve");
  const [adminNote, setAdminNote] = useState("");
  const [revokingUserId, setRevokingUserId] = useState<string | null>(null);
  const [revokeNote, setRevokeNote] = useState("");

  const { data, isLoading } = useAdminVerificationList(statusFilter, page, 25);
  const reviewMutation = useReviewVerificationMutation();
  const revokeMutation = useRevokeVerificationMutation();

  const reviewingItem = data?.items.find((r) => r.id === reviewingId);
  const revokingItem = data?.items.find((r) => r.user_id === revokingUserId);

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
      {/* Filter tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {[null, "pending", "approved", "rejected", "withdrawn", "revoked"].map((s) => (
          <Button
            key={s ?? "all"}
            size="sm"
            variant={statusFilter === s ? "default" : "outline"}
            onClick={() => {
              setStatusFilter(s);
              setPage(1);
            }}
          >
            {s === null ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
        {data && <span className="text-muted-foreground ml-2 text-sm">{data.total} requests</span>}
      </div>

      <div className="space-y-3">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))
          : (data?.items ?? []).map((r) => (
              <Card key={r.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="size-10">
                      <AvatarImage src={r.user_avatar_url ?? undefined} />
                      <AvatarFallback>{r.user_display_name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{r.user_display_name}</p>
                        <p className="text-muted-foreground text-sm">{r.user_email}</p>
                        <Badge
                          variant={
                            r.status === "approved"
                              ? "default"
                              : r.status === "rejected"
                                ? "destructive"
                                : "secondary"
                          }
                          className="text-xs"
                        >
                          {r.status}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mt-2 line-clamp-3 text-sm">{r.message}</p>
                      {r.admin_note && (
                        <p className="text-muted-foreground mt-1 text-xs italic">
                          Note: {r.admin_note}
                        </p>
                      )}
                      <p className="text-muted-foreground mt-2 text-xs">
                        Submitted {new Date(r.created_at).toLocaleDateString()}
                        {r.reviewed_at &&
                          ` · Reviewed ${new Date(r.reviewed_at).toLocaleDateString()}`}
                      </p>
                    </div>
                    {r.status === "pending" && (
                      <div className="flex shrink-0 gap-2">
                        <Button size="sm" onClick={() => openReview(r.id, "approve")}>
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openReview(r.id, "reject")}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                    {r.status === "approved" && r.user_is_verified_creator && (
                      <div className="flex shrink-0 gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setRevokingUserId(r.user_id);
                            setRevokeNote("");
                          }}
                        >
                          Revoke
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Pagination */}
      {data && data.total > 25 && (
        <div className="flex items-center justify-between">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-muted-foreground text-sm">
            Page {data.page} of {Math.ceil(data.total / data.per_page)}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= Math.ceil(data.total / data.per_page)}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={!!reviewingId} onOpenChange={(open) => !open && setReviewingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === "approve" ? "Approve" : "Reject"} Verification Request
            </DialogTitle>
          </DialogHeader>
          {reviewingItem && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="font-medium">{reviewingItem.user_display_name}</p>
                <p className="text-muted-foreground mt-0.5 text-xs">{reviewingItem.user_email}</p>
                <p className="mt-2">{reviewingItem.message}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-note">
                  {reviewAction === "reject"
                    ? "Rejection reason (required)"
                    : "Admin note (optional)"}
                </Label>
                <Textarea
                  id="admin-note"
                  placeholder={
                    reviewAction === "reject"
                      ? "Explain why the request is being rejected…"
                      : "Optional message for the creator…"
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
                <p className="font-medium">{revokingItem.user_display_name}</p>
                <p className="text-muted-foreground mt-0.5 text-xs">{revokingItem.user_email}</p>
              </div>
              <p className="text-muted-foreground text-sm">
                This will remove the Verified Creator badge from this user. They will be notified
                and may re-apply in the future.
              </p>
              <div className="space-y-2">
                <Label htmlFor="revoke-note">Reason for revoking (optional)</Label>
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
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <div className="flex items-center gap-3">
        <Shield size={24} className="text-primary" />
        <div>
          <h1 className="text-xl font-bold">Superadmin Dashboard</h1>
          <p className="text-muted-foreground text-sm">Platform-wide analytics and moderation</p>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="verifications">Verifications</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="users" className="mt-6">
          <UsersTab />
        </TabsContent>
        <TabsContent value="verifications" className="mt-6">
          <VerificationsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
