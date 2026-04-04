/**
 * Public certificate verification page — premium credential view.
 *
 * Layout: responsive two-column — left: metadata + syllabus, right: certificate + actions.
 * Theme: system-default with toggle. Certificate card itself stays light always.
 */
import { useParams, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  ArrowLeft,
  Share2,
  Copy,
  Check,
  ShieldCheck,
  Layers,
  FileText,
  BookOpen,
  PlayCircle,
  StickyNote,
  ChevronDown,
  Sun,
  Moon,
  CheckCircle2,
} from "lucide-react";
import { useState } from "react";
import { CertificatePreview } from "@/components/certificate/CertificatePreview";
import { CertificateDownload } from "@/components/certificate/CertificateDownload";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { api } from "@/lib/api";
import type { CertificateDetailResponse, CertificateSectionBrief } from "@/types/certificate";

/* ───────────────────────── Token System ────────────────────────── */

function tokens(dark: boolean) {
  return dark
    ? {
        pageBg: "#09090b",
        cardBg: "#111113",
        cardBgHover: "#18181b",
        border: "#27272a",
        borderSubtle: "#1e1e22",
        text: "#fafafa",
        textSec: "#a1a1aa",
        textMuted: "#71717a",
        accent: "#818cf8",
        accentSubtle: "rgba(99,102,241,0.12)",
        green: "#4ade80",
        greenSubtle: "rgba(74,222,128,0.1)",
        heroBg: "linear-gradient(160deg, #0c0a1f 0%, #1a0f2e 50%, #0f172a 100%)",
        heroOverlay: "radial-gradient(ellipse at 30% 0%, rgba(99,102,241,0.12) 0%, transparent 60%)",
        pillBg: "#18181b",
        pillBorder: "#27272a",
      }
    : {
        pageBg: "#f8fafc",
        cardBg: "#ffffff",
        cardBgHover: "#f9fafb",
        border: "#e2e8f0",
        borderSubtle: "#f1f5f9",
        text: "#0f172a",
        textSec: "#64748b",
        textMuted: "#94a3b8",
        accent: "#6366f1",
        accentSubtle: "rgba(99,102,241,0.06)",
        green: "#16a34a",
        greenSubtle: "rgba(22,163,74,0.06)",
        heroBg: "linear-gradient(160deg, #eef2ff 0%, #f5f3ff 50%, #ecfeff 100%)",
        heroOverlay: "radial-gradient(ellipse at 30% 0%, rgba(99,102,241,0.06) 0%, transparent 60%)",
        pillBg: "#f1f5f9",
        pillBorder: "#e2e8f0",
      };
}

/* ───────────────────────── Component ──────────────────────────── */

export default function CertificateSharePage() {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const { copied, copyToClipboard } = useCopyToClipboard();
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());
  const [dark, setDark] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  const t = tokens(dark);

  const { data: certificate, isLoading, error } = useQuery<CertificateDetailResponse>({
    queryKey: ["certificate-share", uid],
    queryFn: () => api.get<CertificateDetailResponse>(`/certificates/share/${uid}`),
    enabled: !!uid,
  });

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/certificates/share/${uid}`
    : "";

  const toggleSection = (idx: number) =>
    setExpandedSections((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: t.pageBg }}>
        <Loader2 className="size-6 animate-spin" style={{ color: t.accent }} />
      </div>
    );
  }

  /* ── 404 ── */
  if (error || !certificate) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4" style={{ background: t.pageBg }}>
        <p className="text-7xl font-black" style={{ color: t.borderSubtle }}>404</p>
        <h2 className="text-lg font-semibold" style={{ color: t.text }}>Certificate not found</h2>
        <p className="text-sm" style={{ color: t.textSec }}>
          This link may be invalid or has been removed.
        </p>
        <button
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:opacity-80"
          style={{ borderColor: t.border, color: t.accent }}
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="size-3.5" /> Go home
        </button>
      </div>
    );
  }

  const completedDate = new Date(certificate.completed_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const totalLessons = certificate.sections.reduce((s, sec) => s + sec.lessons.length, 0);

  return (
    <div
      className="min-h-screen"
      style={{ background: t.pageBg, colorScheme: dark ? "dark" : "light" }}
      data-testid="certificate-share-page"
    >
      {/* ══════════ Navbar ══════════ */}
      <nav
        className="sticky top-0 z-50 border-b backdrop-blur"
        style={{
          background: dark ? "rgba(9,9,11,0.85)" : "rgba(255,255,255,0.85)",
          borderColor: t.border,
        }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="" className="size-6" />
            <span className="text-sm font-semibold" style={{ color: t.text }}>
              Learner Verse
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold"
              style={{ background: t.greenSubtle, color: t.green }}
            >
              <ShieldCheck className="size-3" />
              Verified
            </div>
            <button
              onClick={() => setDark((d) => !d)}
              className="flex size-8 items-center justify-center rounded-full border transition-all hover:scale-105"
              style={{ borderColor: t.border, color: t.textSec }}
              aria-label="Toggle theme"
            >
              {dark ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* ══════════ Hero ══════════ */}
      <div className="relative overflow-hidden" style={{ background: t.heroBg }}>
        {/* overlay glow */}
        <div className="pointer-events-none absolute inset-0" style={{ background: t.heroOverlay }} />
        <div className="relative mx-auto max-w-6xl px-5 py-10 sm:py-14">
          <div className="flex items-center gap-2 text-xs font-medium" style={{ color: t.green }}>
            <CheckCircle2 className="size-3.5" />
            Certificate of Completion
          </div>
          <h1
            className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl"
            style={{ color: t.text }}
          >
            {certificate.course_title}
          </h1>
          <p className="mt-3 text-sm" style={{ color: t.textSec }}>
            Earned by{" "}
            <span className="font-semibold" style={{ color: t.text }}>
              {certificate.user_name}
            </span>
            {" "}on {completedDate}
          </p>

          {/* Quick pills */}
          <div className="mt-5 flex flex-wrap gap-2">
            <Pill icon={Layers} label={`${certificate.sections_count} sections`} t={t} />
            <Pill icon={FileText} label={`${certificate.lessons_count} lessons`} t={t} />
            <Pill icon={ShieldCheck} label={certificate.certificate_uid} t={t} mono />
          </div>
        </div>
      </div>

      {/* ══════════ Main Content ══════════ */}
      <div className="mx-auto max-w-6xl px-5 py-10 lg:py-14">
        <div className="grid items-start gap-10 lg:grid-cols-[1fr_400px]">
          {/* ── Left Column ── */}
          <div className="space-y-6">
            {/* About */}
            {certificate.course_description && (
              <Card t={t}>
                <CardHeader icon={BookOpen} title="About This Course" t={t} />
                <p className="text-[13px] leading-relaxed" style={{ color: t.textSec }}>
                  {certificate.course_description}
                </p>
              </Card>
            )}

            {/* Syllabus */}
            {certificate.sections.length > 0 && (
              <div className="overflow-hidden rounded-xl border" style={{ background: t.cardBg, borderColor: t.border }}>
                <div className="px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex size-7 items-center justify-center rounded-lg"
                        style={{ background: t.accentSubtle }}
                      >
                        <Layers className="size-3.5" style={{ color: t.accent }} />
                      </div>
                      <h3 className="text-sm font-semibold" style={{ color: t.text }}>
                        Course Syllabus
                      </h3>
                    </div>
                    <span className="text-xs" style={{ color: t.textMuted }}>
                      {certificate.sections.length} sections · {totalLessons} lessons
                    </span>
                  </div>
                </div>
                <div>
                  {certificate.sections.map((sec, i) => (
                    <SyllabusSection
                      key={i}
                      section={sec}
                      index={i}
                      expanded={expandedSections.has(i)}
                      onToggle={() => toggleSection(i)}
                      t={t}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Right Column ── */}
          <div className="space-y-5 lg:sticky lg:top-20 lg:self-start">
            <CertificatePreview certificate={certificate} compact />

            {/* Actions */}
            <div
              className="flex flex-col gap-2 rounded-xl border p-4"
              style={{ background: t.cardBg, borderColor: t.border }}
            >
              <CertificateDownload certificate={certificate} />

              <div className="grid grid-cols-2 gap-2">
                <ActionBtn
                  onClick={() => copyToClipboard(shareUrl)}
                  icon={copied ? Check : Copy}
                  label={copied ? "Copied!" : "Copy Link"}
                  t={t}
                  green={copied}
                />
                <ActionBtn
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: `${certificate.user_name}'s Certificate`,
                        text: `${certificate.user_name} completed "${certificate.course_title}"`,
                        url: shareUrl,
                      });
                    }
                  }}
                  icon={Share2}
                  label="Share"
                  t={t}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════ Footer ══════════ */}
      <footer className="border-t py-8" style={{ borderColor: t.border }}>
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-5 text-center">
          <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: t.green }}>
            <ShieldCheck className="size-3" />
            Verified by Learner Verse
          </div>
          <p className="font-mono text-[11px]" style={{ color: t.textMuted }}>
            {certificate.certificate_uid}
          </p>
        </div>
      </footer>
    </div>
  );
}

/* ═══════════════════════ Sub-components ═══════════════════════ */

type Tokens = ReturnType<typeof tokens>;

function Pill({
  icon: Icon,
  label,
  t,
  mono,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  t: Tokens;
  mono?: boolean;
}) {
  return (
    <div
      className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium"
      style={{
        background: t.pillBg,
        borderColor: t.pillBorder,
        color: t.textSec,
        fontFamily: mono ? "monospace" : undefined,
        letterSpacing: mono ? "0.05em" : undefined,
      }}
    >
      <Icon className="size-3" style={{ color: t.accent }} />
      {label}
    </div>
  );
}

function Card({ children, t }: { children: React.ReactNode; t: Tokens }) {
  return (
    <div
      className="rounded-xl border p-5"
      style={{ background: t.cardBg, borderColor: t.border }}
    >
      {children}
    </div>
  );
}

function CardHeader({
  icon: Icon,
  title,
  t,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  t: Tokens;
}) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <div
        className="flex size-7 items-center justify-center rounded-lg"
        style={{ background: t.accentSubtle }}
      >
        <Icon className="size-3.5" style={{ color: t.accent }} />
      </div>
      <h3 className="text-sm font-semibold" style={{ color: t.text }}>
        {title}
      </h3>
    </div>
  );
}

function ActionBtn({
  onClick,
  icon: Icon,
  label,
  t,
  green,
}: {
  onClick: () => void;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  t: Tokens;
  green?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-all hover:opacity-80"
      style={{
        borderColor: t.border,
        color: green ? t.green : t.textSec,
        background: "transparent",
      }}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  );
}

function SyllabusSection({
  section,
  index,
  expanded,
  onToggle,
  t,
}: {
  section: CertificateSectionBrief;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  t: Tokens;
}) {
  return (
    <div className="border-t" style={{ borderColor: t.borderSubtle }}>
      <button
        className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors"
        style={{ background: "transparent" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = t.cardBgHover)}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        onClick={onToggle}
      >
        <div
          className="flex size-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold"
          style={{ background: t.accentSubtle, color: t.accent }}
        >
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium" style={{ color: t.text }}>
            {section.title}
          </p>
          <p className="text-[11px]" style={{ color: t.textMuted }}>
            {section.lessons.length} {section.lessons.length === 1 ? "lesson" : "lessons"}
          </p>
        </div>
        <ChevronDown
          className={`size-4 shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          style={{ color: t.textMuted }}
        />
      </button>

      {expanded && (
        <div className="pb-2">
          {section.lessons.map((lesson, i) => (
            <div key={i} className="flex items-center gap-3 py-1.5 pl-[3.75rem] pr-5">
              {lesson.lesson_type === "video" ? (
                <PlayCircle className="size-3.5 shrink-0" style={{ color: t.textMuted }} />
              ) : (
                <StickyNote className="size-3.5 shrink-0" style={{ color: t.textMuted }} />
              )}
              <span className="text-xs" style={{ color: t.textSec }}>
                {lesson.title}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
