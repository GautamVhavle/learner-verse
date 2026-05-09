/**
 * Public learner profile page — LinkedIn-inspired layout.
 *
 * Wide responsive cover banner, avatar overlay, bio, tags, social links,
 * stats cards, responsive activity heatmap, and certificates.
 * Accessible without authentication at /profile/:userId.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Link2,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { VerifiedBadge } from "@/components/shared/VerifiedBadge";
import { usePublicProfileQuery } from "@/hooks/useProfile";
import type { PublicProfile, SocialLink } from "@/types/user";

/* ─── Helpers ──────────────────────────────────────── */

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

/* ─── Responsive Activity Heatmap ──────────────────── */

const CELL_SIZE = 11;
const CELL_GAP = 3;
const CELL_STEP = CELL_SIZE + CELL_GAP;
const LABEL_W = 24;
const MAX_WEEKS = 52;
const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];
const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function getColor(count: number, max: number): string {
  if (count === 0) return "var(--color-heatmap-0)";
  const r = max > 0 ? count / max : 0;
  if (r <= 0.25) return "var(--color-heatmap-1)";
  if (r <= 0.5) return "var(--color-heatmap-2)";
  if (r <= 0.75) return "var(--color-heatmap-3)";
  return "var(--color-heatmap-4)";
}

function computeWeeksForWidth(containerWidth: number): number {
  const available = containerWidth - LABEL_W - 8;
  return Math.min(MAX_WEEKS, Math.max(10, Math.floor(available / CELL_STEP)));
}

function ProfileHeatmap({ days }: { days: { date: string; count: number }[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [weeks, setWeeks] = useState(MAX_WEEKS);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  const measure = useCallback(() => {
    if (!containerRef.current) return;
    setWeeks(computeWeeksForWidth(containerRef.current.clientWidth));
  }, []);

  useEffect(() => {
    measure();
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => measure());
    obs.observe(el);
    return () => obs.disconnect();
  }, [measure]);

  const { grid, maxCount, startDate } = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - (weeks - 1) * 7 - start.getDay());
    const map = new Map<string, number>();
    let max = 0;
    for (const d of days) {
      map.set(d.date, d.count);
      if (d.count > max) max = d.count;
    }
    const cells: { date: string; count: number; w: number; d: number }[] = [];
    for (let w = 0; w < weeks; w++) {
      for (let d = 0; d < 7; d++) {
        const dt = new Date(start);
        dt.setDate(dt.getDate() + w * 7 + d);
        if (dt > today) continue;
        const key = dt.toISOString().slice(0, 10);
        cells.push({ date: key, count: map.get(key) ?? 0, w, d });
      }
    }
    return { grid: cells, maxCount: max, startDate: start };
  }, [days, weeks]);

  const monthLabels = useMemo(() => {
    const labels: { label: string; x: number }[] = [];
    let last = -1;
    for (let w = 0; w < weeks; w++) {
      const dt = new Date(startDate);
      dt.setDate(dt.getDate() + w * 7);
      if (dt.getMonth() !== last) {
        last = dt.getMonth();
        labels.push({ label: MONTH_NAMES[last], x: LABEL_W + w * CELL_STEP });
      }
    }
    return labels;
  }, [startDate, weeks]);

  const totalLessons = days.reduce((s, d) => s + d.count, 0);
  const svgW = LABEL_W + weeks * CELL_STEP;

  return (
    <div className="space-y-2" ref={containerRef}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-text-primary text-sm font-semibold">Activity</h3>
          <p className="text-text-tertiary text-xs">
            {totalLessons} {totalLessons === 1 ? "lesson" : "lessons"} in the last{" "}
            {weeks === MAX_WEEKS ? "year" : `${weeks} weeks`}
          </p>
        </div>
        <div className="text-text-tertiary flex items-center gap-1.5 text-[10px]">
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
        <svg width={svgW} height={7 * CELL_STEP + 22} className="block select-none">
          {monthLabels.map((m) => (
            <text key={`${m.label}-${m.x}`} x={m.x} y={9} className="fill-text-tertiary text-[9px]">
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
              className="cursor-pointer transition-opacity hover:opacity-75"
              onMouseEnter={(e) => {
                const formatted = new Date(c.date + "T00:00:00").toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });
                setTooltip({
                  text:
                    c.count === 0
                      ? `No lessons on ${formatted}`
                      : `${c.count} ${c.count === 1 ? "lesson" : "lessons"} on ${formatted}`,
                  x: e.clientX,
                  y: e.clientY,
                });
              }}
              onMouseLeave={() => setTooltip(null)}
            />
          ))}
        </svg>
      </div>
      {tooltip && (
        <div
          className="bg-popover text-popover-foreground ring-border pointer-events-none fixed z-50 rounded-md px-2.5 py-1.5 text-xs font-medium shadow-lg ring-1"
          style={{ left: tooltip.x + 12, top: tooltip.y - 36 }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}

/* ─── Stat Card ────────────────────────────────────── */

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
    <div className="border-border-default bg-bg-secondary flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center sm:p-4">
      <div
        className="flex size-9 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${color}15` }}
      >
        <Icon className="size-4" style={{ color }} />
      </div>
      <span className="text-text-primary text-xl font-bold sm:text-2xl">{value}</span>
      <span className="text-text-tertiary text-[10px] leading-tight sm:text-[11px]">{label}</span>
    </div>
  );
}

/* ─── Social Link Icon Helper ──────────────────────── */

function getLinkDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "";
  }
}

function SocialLinks({ links }: { links: SocialLink[] }) {
  if (links.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {links.map((link, i) => (
        <a
          key={i}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="border-border-default bg-bg-secondary text-text-secondary hover:border-accent-blue hover:text-accent-blue inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors"
        >
          <Link2 className="size-3" />
          {link.label || getLinkDomain(link.url)}
        </a>
      ))}
    </div>
  );
}

/* ─── Main Page ────────────────────────────────────── */

export default function PublicProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { data: profile, isLoading, isError } = usePublicProfileQuery(userId!);

  if (isLoading) {
    return (
      <div className="bg-bg-primary flex min-h-screen items-center justify-center">
        <Loader2 className="text-text-tertiary size-8 animate-spin" />
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="bg-bg-primary flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <div className="bg-bg-secondary flex size-16 items-center justify-center rounded-full">
          <GraduationCap className="text-text-tertiary size-8" />
        </div>
        <h1 className="text-text-primary text-xl font-semibold">Profile Not Found</h1>
        <p className="text-text-secondary max-w-sm text-center text-sm">
          This profile doesn't exist or is set to private.
        </p>
        <Link
          to="/"
          className="text-accent-blue mt-2 flex items-center gap-1.5 text-sm hover:underline"
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
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Profile link copied!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <div className="bg-bg-primary min-h-screen">
      {/* ── Top Nav ── */}
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
        <Link
          to="/"
          className="text-text-secondary hover:bg-bg-secondary hover:text-text-primary flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition-colors"
        >
          <GraduationCap className="size-4" /> Learner Verse
        </Link>
        <button
          onClick={handleShare}
          className="border-border-default bg-bg-secondary text-text-secondary hover:text-text-primary flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
        >
          <Share2 className="size-3" /> Share
        </button>
      </div>

      {/* ── Profile Card ── */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="border-border-default bg-bg-secondary overflow-hidden rounded-2xl border">
          {/* Cover banner — 4:1 aspect ratio like LinkedIn */}
          <div className="relative aspect-[4/1] w-full overflow-hidden">
            {profile.cover_image_url ? (
              <img src={profile.cover_image_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="from-accent-blue/20 via-accent-purple/15 to-accent-green/10 h-full w-full bg-gradient-to-br" />
            )}
          </div>

          {/* Profile info area */}
          <div className="relative px-5 pb-5 sm:px-7 sm:pb-6">
            {/* Avatar — overlapping the cover */}
            <div className="-mt-14 sm:-mt-16 md:-mt-20">
              <Avatar className="border-bg-secondary !size-28 border-4 shadow-lg sm:!size-32 md:!size-36">
                {profile.avatar_url ? (
                  <AvatarImage src={profile.avatar_url} alt={profile.display_name} />
                ) : null}
                <AvatarFallback className="text-4xl font-bold sm:text-5xl">
                  {profile.display_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Identity */}
            <div className="mt-3 space-y-2.5">
              <div>
                <h1 className="text-text-primary flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
                  {profile.display_name}
                  {profile.is_verified_creator && <VerifiedBadge size={22} />}
                </h1>
                {profile.bio && (
                  <p className="text-text-secondary mt-1 max-w-2xl text-sm leading-relaxed sm:text-[15px]">
                    {profile.bio}
                  </p>
                )}
              </div>

              {/* Tags */}
              {profile.profile_tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {profile.profile_tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-accent-blue/10 text-accent-blue rounded-full px-2.5 py-0.5 text-xs font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Social links + member since */}
              <div className="flex flex-col gap-2 pt-0.5 sm:flex-row sm:items-center sm:gap-4">
                <SocialLinks links={profile.social_links} />
                <p className="text-text-tertiary flex items-center gap-1.5 text-xs">
                  <Calendar className="size-3" />
                  Member since {formatDate(profile.member_since, "long")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="mt-6 space-y-6 pb-16">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
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

          {/* Activity Heatmap */}
          {profile.activity_heatmap.length > 0 && (
            <div className="border-border-default bg-bg-secondary rounded-xl border p-4 sm:p-5">
              <ProfileHeatmap days={profile.activity_heatmap} />
            </div>
          )}

          {/* Certificates */}
          {profile.certificates.length > 0 && (
            <div className="border-border-default bg-bg-secondary rounded-xl border p-4 sm:p-5">
              <h3 className="text-text-primary mb-4 flex items-center gap-2 text-sm font-semibold">
                <Award className="text-accent-amber size-4" />
                Certificates ({profile.certificates.length})
              </h3>
              <div className="space-y-2">
                {profile.certificates.map((cert) => (
                  <div
                    key={cert.certificate_uid}
                    className="group border-border-default bg-bg-tertiary hover:border-accent-amber/30 flex items-center justify-between rounded-lg border px-3 py-2.5 transition-colors sm:px-4 sm:py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-accent-amber/10 flex size-8 shrink-0 items-center justify-center rounded-lg">
                        <Award className="text-accent-amber size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-text-primary truncate text-sm font-medium">
                          {cert.course_title}
                        </p>
                        <p className="text-text-tertiary text-[11px]">
                          {relativeTime(cert.completed_at)} &middot;{" "}
                          {formatDate(cert.completed_at, "short")}
                        </p>
                      </div>
                    </div>
                    <a
                      href={`/certificates/share/${cert.certificate_uid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-text-tertiary hover:text-accent-blue flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs opacity-0 transition-all group-hover:opacity-100"
                    >
                      View <ExternalLink className="size-3" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {profile.total_lessons_completed === 0 && profile.certificates.length === 0 && (
            <div className="border-border-default bg-bg-secondary rounded-xl border p-8 text-center">
              <GraduationCap className="text-text-tertiary mx-auto mb-3 size-8" />
              <p className="text-text-secondary text-sm">
                {profile.display_name} just started their learning journey!
              </p>
            </div>
          )}

          {/* Footer */}
          <p className="text-text-tertiary text-center text-[11px]">
            Powered by{" "}
            <Link to="/" className="text-accent-blue hover:underline">
              Learner Verse
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
