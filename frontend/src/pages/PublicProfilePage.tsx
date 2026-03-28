/**
 * Public learner profile page.
 *
 * Beautiful, data-driven profile with hero section, stats cards,
 * activity heatmap, and certificates timeline.
 * Accessible without authentication at /profile/:userId.
 */
import { useMemo } from "react";
import { useParams, Link } from "react-router";
import {
  Award,
  BookOpen,
  Calendar,
  Flame,
  GraduationCap,
  Loader2,
  Trophy,
  Zap,
  ArrowLeft,
  Share2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { usePublicProfileQuery } from "@/hooks/useProfile";
import type { PublicProfile } from "@/types/user";

/* ─── Helpers ────────────────────────────────────────────── */

function formatDate(iso: string, style: "short" | "long" = "long") {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: style,
    ...(style === "short" ? {} : { day: "numeric" }),
  });
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

/* ─── Activity Heatmap (self-contained for public page) ──── */

const CELL_SIZE = 11;
const CELL_GAP = 3;
const CELL_STEP = CELL_SIZE + CELL_GAP;
const LABEL_W = 24;
const WEEKS = 52;
const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function getColor(count: number, max: number): string {
  if (count === 0) return "var(--color-heatmap-0)";
  const r = max > 0 ? count / max : 0;
  if (r <= 0.25) return "var(--color-heatmap-1)";
  if (r <= 0.5) return "var(--color-heatmap-2)";
  if (r <= 0.75) return "var(--color-heatmap-3)";
  return "var(--color-heatmap-4)";
}

function ProfileHeatmap({ days }: { days: { date: string; count: number }[] }) {
  const { grid, maxCount, startDate } = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - (WEEKS - 1) * 7 - start.getDay());

    const map = new Map<string, number>();
    let max = 0;
    for (const d of days) {
      map.set(d.date, d.count);
      if (d.count > max) max = d.count;
    }

    const cells: { date: string; count: number; w: number; d: number }[] = [];
    for (let w = 0; w < WEEKS; w++) {
      for (let d = 0; d < 7; d++) {
        const dt = new Date(start);
        dt.setDate(dt.getDate() + w * 7 + d);
        if (dt > today) continue;
        const key = dt.toISOString().slice(0, 10);
        cells.push({ date: key, count: map.get(key) ?? 0, w, d });
      }
    }
    return { grid: cells, maxCount: max, startDate: start };
  }, [days]);

  const monthLabels = useMemo(() => {
    const labels: { label: string; x: number }[] = [];
    let last = -1;
    for (let w = 0; w < WEEKS; w++) {
      const dt = new Date(startDate);
      dt.setDate(dt.getDate() + w * 7);
      if (dt.getMonth() !== last) {
        last = dt.getMonth();
        labels.push({ label: MONTH_NAMES[last], x: LABEL_W + w * CELL_STEP });
      }
    }
    return labels;
  }, [startDate]);

  const totalLessons = days.reduce((s, d) => s + d.count, 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">Activity</h3>
        <div className="flex items-center gap-1.5 text-[10px] text-text-tertiary">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((l) => (
            <div
              key={l}
              className="size-2.5 rounded-[2px]"
              style={{ backgroundColor: `var(--color-heatmap-${l})` }}
            />
          ))}
          <span>More</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <svg
          width={LABEL_W + WEEKS * CELL_STEP}
          height={7 * CELL_STEP + 22}
          className="block select-none"
        >
          {monthLabels.map((m) => (
            <text
              key={`${m.label}-${m.x}`}
              x={m.x}
              y={9}
              className="fill-text-tertiary text-[9px]"
            >
              {m.label}
            </text>
          ))}
          {DAY_LABELS.map((label, i) =>
            label ? (
              <text
                key={`d-${i}`}
                x={0}
                y={18 + i * CELL_STEP + CELL_SIZE / 2 + 3}
                className="fill-text-tertiary text-[9px]"
              >
                {label}
              </text>
            ) : null,
          )}
          {grid.map((c) => (
            <rect
              key={c.date}
              x={LABEL_W + c.w * CELL_STEP}
              y={18 + c.d * CELL_STEP}
              width={CELL_SIZE}
              height={CELL_SIZE}
              rx={2}
              fill={getColor(c.count, maxCount)}
            />
          ))}
        </svg>
      </div>
      <p className="text-xs text-text-tertiary">
        {totalLessons} {totalLessons === 1 ? "lesson" : "lessons"} in the last year
      </p>
    </div>
  );
}

/* ─── Stat Card ──────────────────────────────────────────── */

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Flame;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-border-default bg-bg-secondary p-4 text-center">
      <div
        className="mb-1 flex size-9 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${color}15` }}
      >
        <Icon className="size-4" style={{ color }} />
      </div>
      <span className="text-2xl font-bold text-text-primary">{value}</span>
      <span className="text-[11px] text-text-tertiary">{label}</span>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────── */

export default function PublicProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { data: profile, isLoading, isError } = usePublicProfileQuery(userId!);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary">
        <Loader2 className="size-8 animate-spin text-text-tertiary" />
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg-primary px-4">
        <div className="flex size-16 items-center justify-center rounded-full bg-bg-secondary">
          <GraduationCap className="size-8 text-text-tertiary" />
        </div>
        <h1 className="text-xl font-semibold text-text-primary">Profile Not Found</h1>
        <p className="max-w-sm text-center text-sm text-text-secondary">
          This profile doesn't exist or is set to private.
        </p>
        <Link
          to="/"
          className="mt-2 flex items-center gap-1.5 text-sm text-accent-blue hover:underline"
        >
          <ArrowLeft className="size-3.5" /> Go Home
        </Link>
      </div>
    );
  }

  return <ProfileContent profile={profile} />;
}

function ProfileContent({ profile }: { profile: PublicProfile }) {
  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Profile link copied!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Gradient hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-accent-blue/10 via-accent-purple/5 to-accent-green/10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent-blue/5 to-transparent" />
        <div className="relative mx-auto max-w-3xl px-4 pb-16 pt-10 sm:px-6">
          {/* Top bar */}
          <div className="mb-8 flex items-center justify-between">
            <Link
              to="/"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-secondary/80 hover:text-text-primary"
            >
              <GraduationCap className="size-3.5" /> Learner Verse
            </Link>
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 rounded-lg border border-border-default bg-bg-secondary/80 px-3 py-1.5 text-xs font-medium text-text-secondary backdrop-blur-sm transition-colors hover:text-text-primary"
            >
              <Share2 className="size-3" /> Share
            </button>
          </div>

          {/* Profile header */}
          <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left sm:gap-6">
            <Avatar size="lg" className="size-24 ring-4 ring-bg-primary shadow-xl sm:size-28">
              {profile.avatar_url ? (
                <AvatarImage src={profile.avatar_url} alt={profile.display_name} />
              ) : null}
              <AvatarFallback className="text-3xl font-semibold">
                {profile.display_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="mt-4 sm:mt-1">
              <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">
                {profile.display_name}
              </h1>
              {profile.bio && (
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-text-secondary">
                  {profile.bio}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                {profile.profile_tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-accent-blue/10 px-2.5 py-0.5 text-xs font-medium text-accent-blue"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-text-tertiary sm:justify-start">
                <Calendar className="size-3" />
                Member since {formatDate(profile.member_since, "long")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-3xl space-y-6 px-4 -mt-6 pb-16 sm:px-6">
        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard
            icon={BookOpen}
            label="Courses Completed"
            value={profile.total_courses_completed}
            color="var(--color-accent-blue)"
          />
          <StatCard
            icon={Zap}
            label="Lessons Done"
            value={profile.total_lessons_completed}
            color="var(--color-accent-purple)"
          />
          <StatCard
            icon={Flame}
            label="Current Streak"
            value={profile.current_streak}
            color="var(--color-accent-amber)"
          />
          <StatCard
            icon={Trophy}
            label="Best Streak"
            value={profile.longest_streak}
            color="var(--color-accent-green)"
          />
          <StatCard
            icon={Calendar}
            label="Active Days"
            value={profile.total_active_days}
            color="#6366f1"
          />
        </div>

        {/* Activity heatmap */}
        {profile.activity_heatmap.length > 0 && (
          <div className="rounded-xl border border-border-default bg-bg-secondary p-5">
            <ProfileHeatmap days={profile.activity_heatmap} />
          </div>
        )}

        {/* Certificates */}
        {profile.certificates.length > 0 && (
          <div className="rounded-xl border border-border-default bg-bg-secondary p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-text-primary">
              <Award className="size-4 text-accent-amber" />
              Certificates ({profile.certificates.length})
            </h3>
            <div className="space-y-3">
              {profile.certificates.map((cert) => (
                <div
                  key={cert.certificate_uid}
                  className="group flex items-center justify-between rounded-lg border border-border-default bg-bg-tertiary px-4 py-3 transition-colors hover:border-accent-amber/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-accent-amber/10">
                      <Award className="size-4 text-accent-amber" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {cert.course_title}
                      </p>
                      <p className="text-[11px] text-text-tertiary">
                        Earned {relativeTime(cert.completed_at)} &middot;{" "}
                        {formatDate(cert.completed_at, "short")}
                      </p>
                    </div>
                  </div>
                  <a
                    href={`/certificates/share/${cert.certificate_uid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-text-tertiary opacity-0 transition-all hover:text-accent-blue group-hover:opacity-100"
                  >
                    View <ExternalLink className="size-3" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state for brand new profiles */}
        {profile.total_lessons_completed === 0 &&
          profile.certificates.length === 0 && (
            <div className="rounded-xl border border-border-default bg-bg-secondary p-8 text-center">
              <GraduationCap className="mx-auto mb-3 size-8 text-text-tertiary" />
              <p className="text-sm text-text-secondary">
                {profile.display_name} just started their learning journey!
              </p>
            </div>
          )}

        {/* Footer */}
        <p className="text-center text-[11px] text-text-tertiary">
          Powered by{" "}
          <Link to="/" className="text-accent-blue hover:underline">
            Learner Verse
          </Link>
        </p>
      </div>
    </div>
  );
}
