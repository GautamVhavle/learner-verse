/**
 * Two Learning Paths: visually rich split section showcasing
 * self-directed learning vs. structured creator courses.
 * Uses MagicCard spotlight, BorderBeam, and animated flow steps.
 */
import {
  BookOpen,
  Users,
  Youtube,
  Brain,
  Award,
  Globe,
  GraduationCap,
  MessageCircle,
  ArrowRight,
  Sparkles,
  BarChart3,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { BlurFade } from "@/components/ui/blur-fade";
import { MagicCard } from "@/components/ui/magic-card";
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern";

const SELF_STEPS = [
  {
    icon: Youtube,
    label: "Paste any YouTube URL",
    sub: "video or full playlist",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/15",
  },
  {
    icon: Brain,
    label: "AI builds your course",
    sub: "sections, lessons, order",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/15",
  },
  {
    icon: BarChart3,
    label: "Track & quiz yourself",
    sub: "streaks, scores, notes",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/15",
  },
  {
    icon: Award,
    label: "Earn your certificate",
    sub: "shareable public link",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/15",
  },
] as const;

const CREATOR_COURSES = [
  { name: "React Mastery", category: "Frontend", color: "bg-blue-400", enrolled: "1.2k" },
  { name: "Python for AI", category: "Machine Learning", color: "bg-purple-400", enrolled: "2.1k" },
  { name: "System Design", category: "Backend", color: "bg-emerald-400", enrolled: "890" },
] as const;

const CREATOR_PERKS = [
  { icon: Globe, label: "Browse Course Hub", color: "text-cyan-400" },
  { icon: GraduationCap, label: "Guided learning paths", color: "text-purple-400" },
  { icon: MessageCircle, label: "Community discussions", color: "text-emerald-400" },
  { icon: CheckCircle2, label: "Earn verified certificates", color: "text-amber-400" },
] as const;

export function SocialProofBar() {
  return (
    <section className="relative overflow-hidden border-y border-white/5 bg-[#030712] py-20 sm:py-24">
      {/* Subtle animated grid background */}
      <AnimatedGridPattern
        numSquares={20}
        maxOpacity={0.025}
        duration={4}
        className="absolute inset-0 [mask-image:radial-gradient(ellipse_80%_60%_at_50%_50%,black,transparent)]"
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        {/* Heading */}
        <BlurFade delay={0} inView>
          <div className="mb-12 text-center">
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/50">
              <Sparkles className="size-3 text-purple-400" />
              One platform, two powerful paths
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">
              Learn your way.{" "}
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                No compromises.
              </span>
            </h2>
          </div>
        </BlurFade>

        <div className="grid gap-5 sm:gap-6 lg:grid-cols-2">
          {/* ── Card 1: Self-Paced Learning ── */}
          <BlurFade delay={0.05} inView>
            <MagicCard
              className="group relative h-full overflow-hidden rounded-2xl border border-blue-500/15 bg-gradient-to-br from-blue-500/[0.06] to-transparent p-6 sm:p-7"
              gradientColor="rgba(59,130,246,0.08)"
            >
              {/* Card header */}
              <div className="mb-6 flex items-start gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 shadow-lg shadow-blue-500/10">
                  <BookOpen className="size-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white sm:text-lg">Self-Paced Learning</h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-white/45 sm:text-sm">
                    Build your own course from any YouTube video or playlist.
                  </p>
                </div>
              </div>

              {/* Animated step flow */}
              <div className="flex flex-col gap-3">
                {SELF_STEPS.map((step, i) => (
                  <div key={step.label} className="flex items-center gap-3">
                    <div
                      className={`flex size-9 shrink-0 items-center justify-center rounded-xl border ${step.border} ${step.bg}`}
                    >
                      <step.icon className={`size-4 ${step.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white/80">{step.label}</p>
                      <p className="text-[11px] text-white/35">{step.sub}</p>
                    </div>
                    {i < SELF_STEPS.length - 1 && (
                      <ChevronRight className="size-3.5 shrink-0 text-white/15" />
                    )}
                    {i === SELF_STEPS.length - 1 && (
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                    )}
                  </div>
                ))}
              </div>

              {/* Mini URL input visual */}
              <div className="mt-5 overflow-hidden rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-[#030712] px-3 py-2">
                  <Youtube className="size-3.5 shrink-0 text-red-400" />
                  <span className="flex-1 truncate text-[11px] text-white/25">
                    youtube.com/playlist?list=PL...
                  </span>
                  <div className="rounded-md bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
                    Import
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1.5 pl-1 text-[11px] text-emerald-400/70">
                  <Sparkles className="size-3" />
                  AI-organized into sections instantly
                </div>
              </div>
            </MagicCard>
          </BlurFade>

          {/* ── Card 2: Learn from Creators ── */}
          <BlurFade delay={0.1} inView>
            <MagicCard
              className="group relative h-full overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/[0.07] to-pink-500/[0.03] p-6 sm:p-7"
              gradientColor="rgba(168,85,247,0.08)"
            >
              {/* Card header */}
              <div className="mb-6 flex items-start gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10 shadow-lg shadow-purple-500/10">
                  <Users className="size-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white sm:text-lg">Learn from Creators</h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-white/45 sm:text-sm">
                    Enroll in structured courses curated by educators and YouTubers.
                  </p>
                </div>
              </div>

              {/* Mini course hub visual */}
              <div className="mb-4 flex flex-col gap-2.5">
                {CREATOR_COURSES.map((course) => (
                  <div
                    key={course.name}
                    className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3.5 py-2.5 transition-colors hover:border-purple-500/15 hover:bg-purple-500/[0.03]"
                  >
                    <div className={`size-2 rounded-full ${course.color}`} />
                    <span className="flex-1 text-sm font-medium text-white/75">{course.name}</span>
                    <span className="text-[10px] text-white/30">{course.category}</span>
                    <div className="flex items-center gap-1 rounded-full bg-white/[0.04] px-2 py-0.5">
                      <Users className="size-2.5 text-white/30" />
                      <span className="text-[10px] text-white/40">{course.enrolled}</span>
                    </div>
                    <ArrowRight className="size-3 text-white/20" />
                  </div>
                ))}
              </div>

              {/* Perks grid */}
              <div className="grid grid-cols-2 gap-2">
                {CREATOR_PERKS.map((perk) => (
                  <div
                    key={perk.label}
                    className="flex items-center gap-2 rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2"
                  >
                    <perk.icon className={`size-3.5 shrink-0 ${perk.color}`} />
                    <span className="text-[11px] text-white/55">{perk.label}</span>
                  </div>
                ))}
              </div>
            </MagicCard>
          </BlurFade>
        </div>
      </div>
    </section>
  );
}
