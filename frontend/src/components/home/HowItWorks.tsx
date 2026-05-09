/**
 * How It Works — 3-step flow showing the journey from
 * YouTube video to mastery. Each step connected visually
 * with dotted lines animated on scroll.
 */
import { useEffect, useRef } from "react";
import { Upload, GraduationCap, Trophy, Youtube, Sparkles, ArrowRight } from "lucide-react";
import { BlurFade } from "@/components/ui/blur-fade";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const STEPS = [
  {
    number: "01",
    icon: Upload,
    iconColor: "text-blue-400",
    iconBg: "from-blue-500/20 to-blue-500/5",
    title: "Import",
    subtitle: "Paste a YouTube URL",
    description:
      "Paste any YouTube video or playlist URL. LearnerVerse automatically creates a structured course with sections and organized lessons.",
    visual: (
      <div className="mt-5 overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] p-3 sm:p-4">
        <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.03] px-2.5 py-2 sm:gap-3 sm:px-3 sm:py-2.5">
          <Youtube className="size-4 shrink-0 text-red-400" />
          <span className="min-w-0 flex-1 truncate text-xs text-white/30">
            https://youtube.com/playlist?list=PL...
          </span>
          <div className="rounded-md bg-blue-500/20 px-2 py-0.5 text-[11px] font-medium text-blue-400">
            Import
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-[11px] text-emerald-400">
          <Sparkles className="size-3" />
          <span>AI auto-organizes into sections</span>
        </div>
      </div>
    ),
  },
  {
    number: "02",
    icon: GraduationCap,
    iconColor: "text-purple-400",
    iconBg: "from-purple-500/20 to-purple-500/5",
    title: "Learn",
    subtitle: "Study with AI assistance",
    description:
      "Study at your own pace with AI-generated quizzes, inline LiVi chat for instant help, progress tracking, and a Pomodoro timer for focus.",
    visual: (
      <div className="mt-5 flex flex-col gap-2 overflow-hidden">
        <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-2 sm:gap-3 sm:px-3">
          <div className="size-2 shrink-0 rounded-full bg-emerald-400" />
          <span className="min-w-0 flex-1 truncate text-xs text-white/50">
            Watch: React Hooks Deep Dive
          </span>
          <span className="text-[11px] text-emerald-400">✓</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-purple-500/10 bg-purple-500/5 px-2.5 py-2 sm:gap-3 sm:px-3">
          <div className="size-2 shrink-0 animate-pulse rounded-full bg-purple-400" />
          <span className="min-w-0 flex-1 truncate text-xs text-white/60">
            Quiz: Test Your Knowledge
          </span>
          <span className="text-[11px] text-purple-400">In Progress</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-2 sm:gap-3 sm:px-3">
          <div className="size-2 shrink-0 rounded-full bg-white/15" />
          <span className="min-w-0 flex-1 truncate text-xs text-white/30">
            Watch: Context API Patterns
          </span>
        </div>
      </div>
    ),
  },
  {
    number: "03",
    icon: Trophy,
    iconColor: "text-amber-400",
    iconBg: "from-amber-500/20 to-amber-500/5",
    title: "Achieve",
    subtitle: "Earn & share your success",
    description:
      "Earn verifiable certificates, build learning streaks, share your public profile, and discover community courses in the Hub.",
    visual: (
      <div className="mt-5 flex flex-col items-center gap-3 overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center sm:p-4">
        <Trophy className="size-7 text-amber-400 sm:size-8" />
        <div className="text-xs font-semibold text-white/70">Course Completed!</div>
        <div className="flex items-center gap-3 text-[11px] text-white/40">
          <span>🔥 12-day streak</span>
          <span>•</span>
          <span>📜 Certificate earned</span>
        </div>
        <div className="rounded-full bg-amber-500/10 px-3 py-1 text-[11px] font-medium text-amber-400">
          Share Profile →
        </div>
      </div>
    ),
  },
];

export function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".step-card",
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.2,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 70%",
          },
        },
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section id="how-it-works" ref={sectionRef} className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Heading */}
        <BlurFade delay={0} inView>
          <div className="mb-16 text-center">
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/60">
              <ArrowRight className="size-3" />
              Simple 3-Step Process
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
              From YouTube to{" "}
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-amber-400 bg-clip-text text-transparent">
                mastery
              </span>{" "}
              in 3 steps.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-white/50 sm:text-lg">
              No complicated setup. Just paste a link and start learning.
            </p>
          </div>
        </BlurFade>

        {/* Steps grid */}
        <div className="grid gap-5 md:grid-cols-3 md:gap-8">
          {STEPS.map((step, i) => (
            <div
              key={step.number}
              className="step-card relative flex flex-col rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 opacity-0 sm:p-6"
            >
              {/* Step number badge */}
              <div className="mb-4 flex items-center justify-between">
                <div className="relative">
                  <div
                    className={`flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br ${step.iconBg}`}
                  >
                    <step.icon className={`size-5 ${step.iconColor}`} />
                  </div>
                </div>
                <span className="text-3xl font-bold text-white/[0.06]">{step.number}</span>
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold text-white">{step.title}</h3>
              <p className="mt-0.5 text-sm font-medium text-white/40">{step.subtitle}</p>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-white/45">
                {step.description}
              </p>

              {/* Visual */}
              {step.visual}

              {/* Arrow connector (desktop only, except last) */}
              {i < STEPS.length - 1 && (
                <div className="pointer-events-none absolute top-1/2 -right-[26px] z-10 hidden -translate-y-1/2 md:block">
                  <ArrowRight className="size-5 text-white/10" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
