/**
 * Creator Showcase section: dedicated marketing for content creators,
 * YouTubers, and educators showing how LearnerVerse helps them
 * reach more students with structured, AI-enhanced courses.
 *
 * Layout: two-column split with copy left, creator dashboard
 * visual preview on the right. Matches the AIShowcase pattern.
 */
import { useEffect, useRef } from "react";
import {
  Upload,
  Users,
  BarChart3,
  Award,
  Globe,
  Sparkles,
  ArrowRight,
  Check,
  TrendingUp,
  Eye,
  Star,
} from "lucide-react";
import { useNavigate } from "react-router";
import { ShineBorder } from "@/components/ui/shine-border";
import { BlurFade } from "@/components/ui/blur-fade";
import { useAuth } from "@/hooks/useAuth";
import { SINGLE_USER_MODE } from "@/lib/auth";
import { gsap } from "@/lib/gsap";

const CREATOR_BENEFITS = [
  "Import your existing playlists in one click",
  "AI organizes your content into sections automatically",
  "Your learners earn certificates from YOUR course",
  "Analytics dashboard shows engagement and completion",
  "Publish to Course Hub and reach new students",
  "Build your teaching brand with a public profile",
] as const;

const CREATOR_PILLS = [
  {
    icon: Upload,
    label: "1-Click Import",
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/15",
  },
  {
    icon: BarChart3,
    label: "Analytics",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/15",
  },
  {
    icon: Globe,
    label: "Course Hub",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10 border-cyan-500/15",
  },
  {
    icon: Award,
    label: "Certificates",
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/15",
  },
] as const;

/** Creator dashboard preview visual. */
function CreatorDashboardVisual() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#08080f] shadow-2xl shadow-amber-500/5">
      {/* Top bar */}
      <div className="flex items-center gap-2 border-b border-white/[0.04] px-4 py-2">
        <div className="flex gap-1.5">
          <div className="size-2 rounded-full bg-[#ff5f57]" />
          <div className="size-2 rounded-full bg-[#febc2e]" />
          <div className="size-2 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex-1 rounded-md bg-white/[0.04] px-3 py-1 text-center text-[10px] text-white/20">
          learnerverse.com/creator/analytics
        </div>
      </div>

      {/* Dashboard content */}
      <div className="p-4 sm:p-5">
        {/* Course header */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10">
            <Sparkles className="size-5 text-amber-400" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-white/80">Python for Beginners</div>
            <div className="text-[10px] text-white/35">Published to Course Hub</div>
          </div>
          <div className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-400">
            Live
          </div>
        </div>

        {/* Stats row */}
        <div className="mb-4 grid grid-cols-3 gap-2.5">
          {[
            { icon: Users, label: "Enrolled", value: "48", color: "text-blue-400" },
            { icon: Eye, label: "Views", value: "312", color: "text-purple-400" },
            { icon: Star, label: "Rating", value: "4.7", color: "text-amber-400" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center gap-1 rounded-xl border border-white/[0.04] bg-white/[0.02] p-2.5"
            >
              <stat.icon className={`size-3.5 ${stat.color}`} />
              <span className="text-base font-bold text-white/80">{stat.value}</span>
              <span className="text-[9px] text-white/30">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Completion progress */}
        <div className="mb-4 rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
          <div className="mb-2 flex items-center justify-between text-[11px]">
            <span className="font-medium text-white/55">Avg. Completion</span>
            <span className="font-semibold text-emerald-400">73%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-full w-[73%] rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-1000" />
          </div>
        </div>

        {/* Recent activity */}
        <div className="space-y-2">
          <div className="text-[10px] font-medium tracking-wider text-white/30 uppercase">
            Recent Activity
          </div>
          {[
            {
              text: "New enrollment from Rahul M.",
              time: "2m ago",
              icon: Users,
              color: "text-blue-400",
            },
            {
              text: "Certificate earned by Aisha K.",
              time: "15m ago",
              icon: Award,
              color: "text-amber-400",
            },
            {
              text: "Course rated 5 stars",
              time: "1h ago",
              icon: TrendingUp,
              color: "text-emerald-400",
            },
          ].map((activity) => (
            <div
              key={activity.text}
              className="flex items-center gap-2.5 rounded-lg border border-white/[0.03] bg-white/[0.01] px-3 py-2"
            >
              <activity.icon className={`size-3 shrink-0 ${activity.color}`} />
              <span className="flex-1 truncate text-[11px] text-white/50">{activity.text}</span>
              <span className="shrink-0 text-[9px] text-white/20">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CreatorShowcase() {
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();
  const sectionRef = useRef<HTMLElement>(null);

  const handleCTA = () => {
    if (SINGLE_USER_MODE || isSignedIn) {
      navigate("/creator");
    } else {
      navigate("/login");
    }
  };

  useEffect(() => {
    if (!sectionRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".creator-visual",
        { opacity: 0, x: 40, scale: 0.97 },
        {
          opacity: 1,
          x: 0,
          scale: 1,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 65%",
          },
        },
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative overflow-hidden py-24 sm:py-32">
      {/* Subtle warm background glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_50%,_rgba(245,158,11,0.06)_0%,_transparent_70%)]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section label */}
        <BlurFade delay={0} inView>
          <div className="mb-12 text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 px-3 py-1 text-xs font-medium text-amber-400">
              <Upload className="size-3" />
              For Content Creators
            </div>
          </div>
        </BlurFade>

        {/* Two-column layout */}
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.2fr] lg:gap-14">
          {/* Left: Copy */}
          <BlurFade delay={0.1} inView>
            <div className="flex flex-col gap-8">
              <div>
                <h2 className="text-3xl leading-tight font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
                  Built for{" "}
                  <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                    Creators
                  </span>{" "}
                  Who Teach.
                </h2>
                <p className="mt-4 text-base leading-relaxed text-white/55 sm:text-lg">
                  Turn your YouTube channel into a structured learning platform. Your students get
                  courses, quizzes, certificates, and progress tracking. You get engagement,
                  analytics, and a new way to add value to your audience.
                </p>
              </div>

              {/* Benefit list */}
              <ul className="flex flex-col gap-3">
                {CREATOR_BENEFITS.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3">
                    <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-500/15">
                      <Check className="size-3 text-amber-400" />
                    </div>
                    <span className="text-sm text-white/60">{benefit}</span>
                  </li>
                ))}
              </ul>

              {/* Creator pills */}
              <div className="flex flex-wrap gap-2">
                {CREATOR_PILLS.map((pill) => (
                  <div
                    key={pill.label}
                    className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${pill.bg} ${pill.color}`}
                  >
                    <pill.icon className="size-3" />
                    {pill.label}
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div>
                <button
                  onClick={handleCTA}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  {isSignedIn ? "Open Creator Dashboard" : "Start Creating Free"}
                  <ArrowRight className="size-4" />
                </button>
                <p className="mt-2.5 text-xs text-white/30">
                  Already have a YouTube channel? Import your first course in under 2 minutes.
                </p>
              </div>
            </div>
          </BlurFade>

          {/* Right: Dashboard preview */}
          <BlurFade delay={0.2} inView>
            <div className="creator-visual relative opacity-0">
              <CreatorDashboardVisual />
              <ShineBorder
                shineColor={["#f59e0b", "#f97316", "#ef4444"]}
                borderWidth={1.5}
                className="rounded-2xl"
              />
            </div>
          </BlurFade>
        </div>
      </div>
    </section>
  );
}
