/**
 * Course Analytics detail page — per-course enrollment, completion,
 * ratings breakdown, enrolled learners, and shareable link.
 */
import { useState } from "react";
import { useParams } from "react-router";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Copy,
  GraduationCap,
  Link2,
  MessageSquare,
  Star,
  Users,
} from "lucide-react";
import { DiscussionRoom } from "@/components/discussion/DiscussionRoom";
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
import { toast } from "sonner";
import { useModeAwareNavigate } from "@/hooks/useModeAwareNavigate";
import {
  useCourseAnalyticsQuery,
  useCourseRatingsDetailQuery,
  useCourselearnersQuery,
} from "@/hooks/useAnalytics";
import type { LearnerInfo, RatingDetail } from "@/types/analytics";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";
const SHARE_BASE = API_BASE.replace("/api/v1", "/api/v1/share");

// ── Chart configs ───────────────────────────────────────────

const enrollConfig: ChartConfig = {
  enrollments: { label: "Enrollments", color: "var(--chart-1)" },
};

const compConfig: ChartConfig = {
  completions: { label: "Completions", color: "var(--chart-2)" },
};

const ratingColors = [
  "var(--chart-5)",
  "var(--chart-4)",
  "var(--chart-3)",
  "var(--chart-2)",
  "var(--chart-1)",
];

// ── Helpers ─────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatFull(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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

// ── Stat Mini Card ──────────────────────────────────────────

function MiniStat({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border-default bg-bg-primary px-4 py-3">
      <Icon className={`size-5 ${accent}`} />
      <div>
        <p className="text-lg font-bold text-text-primary">{value}</p>
        <p className="text-xs text-text-secondary">{label}</p>
      </div>
    </div>
  );
}

// ── Star Display ────────────────────────────────────────────

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`size-3.5 ${s <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

// ── Learner Row ─────────────────────────────────────────────

function LearnerRow({ learner }: { learner: LearnerInfo }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border-default bg-bg-primary px-4 py-3">
      {/* Avatar */}
      <div className="size-8 shrink-0 overflow-hidden rounded-full bg-muted">
        {learner.avatar_url ? (
          <img src={learner.avatar_url} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-xs font-bold text-text-secondary">
            {learner.display_name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-primary">{learner.display_name}</p>
        <p className="text-xs text-text-secondary">Enrolled {formatFull(learner.enrolled_at)}</p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        <div className="w-24">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${
                learner.completed_course ? "bg-emerald-500" : "bg-blue-500"
              }`}
              style={{ width: `${Math.min(learner.progress_percent, 100)}%` }}
            />
          </div>
        </div>
        <span className="w-10 text-right text-xs text-text-secondary">
          {Math.round(learner.progress_percent)}%
        </span>
        {learner.completed_course && (
          <CheckCircle2 className="size-4 text-emerald-500" />
        )}
      </div>
    </div>
  );
}

// ── Review Card ─────────────────────────────────────────────

function ReviewCard({ review }: { review: RatingDetail }) {
  return (
    <div className="rounded-lg border border-border-default bg-bg-primary p-4">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="size-8 shrink-0 overflow-hidden rounded-full bg-muted">
          {review.user_avatar ? (
            <img src={review.user_avatar} alt="" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-xs font-bold text-text-secondary">
              {review.user_name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-text-primary">{review.user_name}</p>
            <StarDisplay rating={review.rating} />
            <span className="text-xs text-text-secondary">{formatFull(review.created_at)}</span>
          </div>
          {review.review && (
            <p className="mt-1.5 text-sm text-text-secondary">{review.review}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────

type Tab = "overview" | "learners" | "ratings" | "discussion";

export default function CourseAnalyticsDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useModeAwareNavigate();
  const [tab, setTab] = useState<Tab>("overview");

  // We fetch data from the courses list endpoint and find our course
  const { data: courseData, isLoading: courseLoading } = useCourseAnalyticsQuery({
    sort: "enrollments",
    per_page: 100,
  });
  const { data: ratingsData, isLoading: ratingsLoading } = useCourseRatingsDetailQuery(courseId ?? "");
  const { data: learnersData, isLoading: learnersLoading } = useCourselearnersQuery(courseId ?? "");

  const course = courseData?.items.find((c) => c.course_id === courseId);

  const shareUrl = courseId ? `${SHARE_BASE}/course/${courseId}` : "";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Share link copied to clipboard");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  if (courseLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/analytics")}>
          <ArrowLeft className="mr-1 size-4" /> Back to Analytics
        </Button>
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-text-secondary">Course not found.</p>
        </div>
      </div>
    );
  }

  const enrollTrend = fillTrendGaps(course.enrollment_trend, 30);
  const compTrend = fillTrendGaps(course.completion_trend, 30);
  const ratingPieData = course.rating_distribution.map((b) => ({
    name: `${b.stars}★`,
    value: b.count,
    stars: b.stars,
  }));
  const hasRatings = course.rating_count > 0;

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/analytics")} className="mb-2">
          <ArrowLeft className="mr-1 size-4" /> Back to Analytics
        </Button>
        <div className="flex items-start gap-4">
          {/* Thumbnail */}
          <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
            {course.thumbnail_url ? (
              <img src={course.thumbnail_url} alt="" className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center">
                <BookOpen className="size-6 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight text-text-primary">{course.title}</h1>
            <div className="mt-1 flex items-center gap-3 text-sm text-text-secondary">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                course.is_public
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-muted text-muted-foreground"
              }`}>
                {course.is_public ? "Public" : "Private"}
              </span>
              <span>{course.section_count} sections · {course.lesson_count} lessons</span>
            </div>
          </div>
          {/* Share button */}
          {course.is_public && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCopyLink}>
                <Link2 className="mr-1 size-3.5" /> Copy Share Link
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat label="Enrolled" value={course.enrollment_count} icon={Users} accent="text-blue-500" />
        <MiniStat label="Completed" value={course.completion_count} icon={GraduationCap} accent="text-emerald-500" />
        <MiniStat
          label="Completion Rate"
          value={`${course.completion_rate}%`}
          icon={CheckCircle2}
          accent="text-violet-500"
        />
        <MiniStat
          label="Avg Rating"
          value={hasRatings ? `${course.average_rating} ★` : "—"}
          icon={Star}
          accent="text-amber-500"
        />
      </div>

      {/* Tab Toggle */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {(["overview", "learners", "ratings", ...(course.is_public ? ["discussion"] as const : [])] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t as Tab)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t
                ? "bg-bg-primary text-text-primary shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {t === "overview" ? "Overview" : t === "learners" ? `Learners (${learnersData?.total ?? 0})` : t === "ratings" ? `Ratings (${course.rating_count})` : "Discussion"}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "overview" && (
        <div className="space-y-4">
          {/* Trend Charts */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Enrollment Trend</CardTitle>
                <CardDescription>Last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={enrollConfig} className="h-44 w-full">
                  <AreaChart data={enrollTrend}>
                    <defs>
                      <linearGradient id="eGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} tickFormatter={formatDate} interval="preserveStartEnd" />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} tick={{ fontSize: 10 }} />
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Area type="monotone" dataKey="value" stroke="var(--chart-1)" fill="url(#eGrad)" strokeWidth={2} name="Enrollments" />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Completion Trend</CardTitle>
                <CardDescription>Last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={compConfig} className="h-44 w-full">
                  <AreaChart data={compTrend}>
                    <defs>
                      <linearGradient id="cGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} tickFormatter={formatDate} interval="preserveStartEnd" />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} tick={{ fontSize: 10 }} />
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Area type="monotone" dataKey="value" stroke="var(--chart-2)" fill="url(#cGrad)" strokeWidth={2} name="Completions" />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Rating Distribution */}
          {hasRatings && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Rating Distribution</CardTitle>
                <CardDescription>{course.average_rating} average from {course.rating_count} ratings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <div className="size-32 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={ratingPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={25}
                          outerRadius={55}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {ratingPieData.map((entry, i) => (
                            <Cell key={entry.name} fill={ratingColors[i]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5">
                    {[5, 4, 3, 2, 1].map((stars) => {
                      const bucket = course.rating_distribution.find((b) => b.stars === stars);
                      const count = bucket?.count ?? 0;
                      const pct = course.rating_count > 0 ? (count / course.rating_count) * 100 : 0;
                      return (
                        <div key={stars} className="flex items-center gap-2">
                          <span className="w-8 text-right text-xs text-text-secondary">{stars}★</span>
                          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${pct}%`, backgroundColor: ratingColors[stars - 1] }}
                            />
                          </div>
                          <span className="w-8 text-xs text-text-secondary">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Share Link Card */}
          {course.is_public && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Shareable Link</CardTitle>
                <CardDescription>
                  Share this link on social media — includes OpenGraph preview with course image and description
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 rounded-lg border border-border-default bg-bg-secondary px-3 py-2">
                  <Link2 className="size-4 shrink-0 text-text-secondary" />
                  <code className="flex-1 truncate text-sm text-text-primary">{shareUrl}</code>
                  <Button variant="ghost" size="sm" onClick={handleCopyLink}>
                    <Copy className="size-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {tab === "learners" && (
        <div className="space-y-3">
          {learnersLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
            ))
          ) : learnersData && learnersData.learners.length > 0 ? (
            learnersData.learners.map((l) => (
              <LearnerRow key={l.user_id} learner={l} />
            ))
          ) : (
            <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border-default text-sm text-text-secondary">
              No learners enrolled in this course yet.
            </div>
          )}
        </div>
      )}

      {tab === "discussion" && courseId && (
        <div className="overflow-hidden rounded-xl border border-border-default bg-bg-primary" style={{ height: "calc(100vh - 320px)", minHeight: 400 }}>
          <DiscussionRoom courseId={courseId} />
        </div>
      )}

      {tab === "ratings" && (
        <div className="space-y-4">
          {/* Rating summary */}
          {ratingsData && ratingsData.rating_count > 0 && (
            <div className="flex items-center gap-4 rounded-lg border border-border-default bg-bg-primary p-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-text-primary">{ratingsData.average_rating}</p>
                <StarDisplay rating={ratingsData.average_rating} />
                <p className="mt-1 text-xs text-text-secondary">{ratingsData.rating_count} ratings</p>
              </div>
              <div className="flex flex-1 flex-col gap-1">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const bucket = ratingsData.distribution.find((b) => b.stars === stars);
                  const count = bucket?.count ?? 0;
                  const pct = ratingsData.rating_count > 0 ? (count / ratingsData.rating_count) * 100 : 0;
                  return (
                    <div key={stars} className="flex items-center gap-2">
                      <span className="w-8 text-right text-xs text-text-secondary">{stars}★</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-6 text-xs text-text-secondary">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reviews list */}
          {ratingsLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
            ))
          ) : ratingsData && ratingsData.recent_reviews.length > 0 ? (
            <div className="space-y-3">
              {ratingsData.recent_reviews.map((r) => (
                <ReviewCard key={r.id} review={r} />
              ))}
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border-default text-sm text-text-secondary">
              No ratings for this course yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
