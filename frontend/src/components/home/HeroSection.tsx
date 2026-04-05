/**
 * Hero section — reimagined as a split-layout with animated product demo.
 *
 * Left: punchy headline, subtext, CTAs, social proof
 * Right: animated product showcase showing YouTube → Course transformation
 * Responsive: stacks vertically on mobile.
 */
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import {
  ArrowRight,
  Play,
  Brain,
  Award,
  Sparkles,
  Youtube,
  CheckCircle2,
  BarChart3,
  ChevronRight,
} from "lucide-react";
import { Particles } from "@/components/ui/particles";
import { SparklesText } from "@/components/ui/sparkles-text";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { BorderBeam } from "@/components/ui/border-beam";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import { useAuth } from "@/hooks/useAuth";
import { useMode } from "@/hooks/useMode";
import { SINGLE_USER_MODE } from "@/lib/auth";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/* ── Floating Feature Pills ── */
const PILLS = [
  { icon: Brain, label: "AI Quizzes", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
  { icon: BarChart3, label: "Progress Tracking", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  { icon: Award, label: "Certificates", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  { icon: Sparkles, label: "LiVi AI Tutor", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
];

/* ── Animated Product Demo (replaces static dashboard) ── */
function ProductDemo() {
  return (
    <div className="relative w-full">
      {/* Main card */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#08080f] shadow-2xl shadow-purple-500/5">
        <BorderBeam size={250} duration={12} delay={1} colorFrom="#3b82f6" colorTo="#a855f7" />

        {/* Step 1: Paste URL */}
        <div className="border-b border-white/[0.06] px-4 py-3 sm:px-5 sm:py-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex size-5 items-center justify-center rounded-full bg-blue-500/15">
              <span className="text-[10px] font-bold text-blue-400">1</span>
            </div>
            <span className="text-xs font-medium text-white/50">Paste any YouTube URL</span>
          </div>
          <div className="demo-url flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
            <Youtube className="size-4 shrink-0 text-red-400" />
            <div className="min-w-0 flex-1 overflow-hidden">
              <span className="block truncate text-xs text-white/40 sm:text-sm">youtube.com/playlist?list=PLexample-react-course</span>
            </div>
            <div className="shrink-0 rounded-lg bg-blue-500 px-2.5 py-1 text-[10px] font-semibold text-white sm:text-xs">
              Import
            </div>
          </div>
        </div>

        {/* Step 2: AI organizes */}
        <div className="border-b border-white/[0.06] px-4 py-3 sm:px-5 sm:py-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex size-5 items-center justify-center rounded-full bg-purple-500/15">
              <span className="text-[10px] font-bold text-purple-400">2</span>
            </div>
            <span className="text-xs font-medium text-white/50">AI creates your course</span>
            <div className="demo-sparkle ml-auto flex items-center gap-1 rounded-full bg-purple-500/10 px-2 py-0.5">
              <Sparkles className="size-3 text-purple-400" />
              <span className="text-[10px] text-purple-300">Organizing...</span>
            </div>
          </div>
          {/* Fake course tree */}
          <div className="space-y-1.5">
            {[
              { section: "Getting Started", lessons: 4, done: true },
              { section: "Core Concepts", lessons: 8, done: true },
              { section: "Advanced Patterns", lessons: 6, done: false },
            ].map((s) => (
              <div
                key={s.section}
                className="demo-section flex items-center gap-2.5 rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2"
              >
                {s.done ? (
                  <CheckCircle2 className="size-3.5 shrink-0 text-emerald-400" />
                ) : (
                  <div className="size-3.5 shrink-0 rounded-full border border-white/10" />
                )}
                <span className="min-w-0 flex-1 truncate text-xs text-white/60">{s.section}</span>
                <span className="shrink-0 text-[10px] text-white/25">{s.lessons} lessons</span>
                <ChevronRight className="size-3 shrink-0 text-white/15" />
              </div>
            ))}
          </div>
        </div>

        {/* Step 3: Learn & Track */}
        <div className="px-4 py-3 sm:px-5 sm:py-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex size-5 items-center justify-center rounded-full bg-emerald-500/15">
              <span className="text-[10px] font-bold text-emerald-400">3</span>
            </div>
            <span className="text-xs font-medium text-white/50">Track your progress</span>
          </div>
          <div className="demo-progress flex items-center gap-3 rounded-xl border border-white/[0.04] bg-gradient-to-r from-blue-500/5 to-purple-500/5 p-3">
            <div className="relative size-10 shrink-0 sm:size-12">
              <svg viewBox="0 0 36 36" className="size-full -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15.5" fill="none" stroke="url(#progressGrad)" strokeWidth="3"
                  strokeLinecap="round" strokeDasharray="97.4" strokeDashoffset="24.4"
                />
                <defs>
                  <linearGradient id="progressGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white/70">75%</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-white/70 sm:text-sm">React & Next.js Mastery</div>
              <div className="mt-0.5 text-[10px] text-white/30 sm:text-xs">13 of 18 lessons completed</div>
            </div>
            <div className="hidden items-center gap-1 sm:flex">
              <div className="flex size-6 items-center justify-center rounded-md bg-orange-500/10">
                <span className="text-[10px]">🔥</span>
              </div>
              <span className="text-xs font-medium text-orange-400">7d</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating accent card — Quiz */}
      <div className="demo-float-card absolute -bottom-3 -left-3 z-10 rounded-xl border border-white/[0.08] bg-[#0c0c18]/95 p-3 shadow-xl backdrop-blur-md sm:-bottom-4 sm:-left-6 sm:p-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-purple-500/15">
            <Brain className="size-4 text-purple-400" />
          </div>
          <div>
            <div className="text-xs font-medium text-white/70">AI Quiz Generated</div>
            <div className="text-[10px] text-emerald-400">Score: 9/10 ✓</div>
          </div>
        </div>
      </div>

      {/* Floating accent card — Certificate */}
      <div className="demo-float-card-2 absolute -right-3 -top-3 z-10 rounded-xl border border-white/[0.08] bg-[#0c0c18]/95 p-3 shadow-xl backdrop-blur-md sm:-right-6 sm:-top-4 sm:p-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/15">
            <Award className="size-4 text-amber-400" />
          </div>
          <div>
            <div className="text-xs font-medium text-white/70">Certificate Earned</div>
            <div className="text-[10px] text-white/30">Share & Download</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HeroSection() {
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();
  const { mode } = useMode();
  const sectionRef = useRef<HTMLElement>(null);

  const handleCTA = () => {
    if (SINGLE_USER_MODE || isSignedIn) {
      navigate(mode === "creator" ? "/creator" : "/learner");
    } else {
      navigate("/login");
    }
  };

  useEffect(() => {
    if (!sectionRef.current) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      // Left side entrance
      tl.fromTo(".hero-badge", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 })
        .fromTo(".hero-headline", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.7 }, "-=0.2")
        .fromTo(".hero-subtext", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 }, "-=0.3")
        .fromTo(".hero-cta", { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.1 }, "-=0.2")
        .fromTo(".hero-pill", { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.4, stagger: 0.08 }, "-=0.2")
        .fromTo(".hero-social", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4 }, "-=0.3");

      // Right side: product demo entrance
      tl.fromTo(".hero-demo", { opacity: 0, x: 40, scale: 0.97 }, { opacity: 1, x: 0, scale: 1, duration: 0.8, ease: "power2.out" }, "-=0.8");

      // Floating cards pop in
      tl.fromTo(".demo-float-card", { opacity: 0, x: -20, y: 20 }, { opacity: 1, x: 0, y: 0, duration: 0.5 }, "-=0.3")
        .fromTo(".demo-float-card-2", { opacity: 0, x: 20, y: -20 }, { opacity: 1, x: 0, y: 0, duration: 0.5 }, "-=0.3");

      // Subtle sections stagger
      tl.fromTo(".demo-section", { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.3, stagger: 0.08 }, "-=0.5");

      // Sparkle pulse
      gsap.to(".demo-sparkle", {
        scale: 1.05,
        duration: 1.2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      // Floating cards gentle hover
      gsap.to(".demo-float-card", {
        y: -6,
        duration: 2.5,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
      gsap.to(".demo-float-card-2", {
        y: 6,
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: 0.5,
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-[100dvh] items-center overflow-hidden px-4 py-20 sm:px-6 lg:py-0"
    >
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_20%_40%,_rgba(59,130,246,0.12)_0%,_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_60%,_rgba(168,85,247,0.08)_0%,_transparent_60%)]" />
        <Particles
          className="absolute inset-0"
          quantity={60}
          staticity={40}
          color="#ffffff"
          size={0.4}
        />
      </div>

      {/* Grid */}
      <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16 xl:gap-20">
        {/* ── Left: Copy ── */}
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          {/* Badge */}
          <div className="hero-badge mb-6 opacity-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 backdrop-blur-sm">
              <AnimatedShinyText className="text-sm text-white/80">
                <span className="mr-1.5">🚀</span> Free & Open Source
              </AnimatedShinyText>
              <ChevronRight className="size-3 text-white/30" />
            </div>
          </div>

          {/* Headline */}
          <div className="hero-headline mb-5 opacity-0 sm:mb-6">
            <h1 className="text-3xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-4xl md:text-5xl lg:text-[3.4rem] xl:text-6xl">
              YouTube to{" "}
              <SparklesText
                className="inline-block bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent"
                sparklesCount={4}
                colors={{ first: "#60a5fa", second: "#a78bfa" }}
              >
                Structured
              </SparklesText>
              <br />
              Learning in Seconds.
            </h1>
          </div>

          {/* Subtext */}
          <p className="hero-subtext mb-8 max-w-lg text-sm leading-relaxed text-white/45 opacity-0 sm:text-base lg:text-lg">
            Paste any playlist. AI builds your course with sections, quizzes,
            progress tracking & certificates — instantly.
          </p>

          {/* CTAs */}
          <div className="mb-8 flex flex-col items-center gap-3 sm:flex-row lg:items-start">
            <ShimmerButton
              onClick={handleCTA}
              shimmerColor="#a855f7"
              shimmerSize="0.08em"
              background="linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #a855f7 100%)"
              borderRadius="14px"
              className="hero-cta h-12 px-8 text-sm font-semibold opacity-0 sm:text-base"
            >
              <span className="flex items-center gap-2 text-white">
                {isSignedIn ? "Go to Dashboard" : "Start Learning Free"}
                <ArrowRight className="size-4" />
              </span>
            </ShimmerButton>
            <button
              onClick={() => {
                document.querySelector("#how-it-works")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="hero-cta flex h-12 items-center gap-2 rounded-[14px] border border-white/[0.08] bg-white/[0.03] px-6 text-sm font-medium text-white/60 opacity-0 backdrop-blur-sm transition-all hover:border-white/15 hover:bg-white/[0.06] hover:text-white/90"
            >
              <Play className="size-3.5" />
              Watch Demo
            </button>
          </div>

          {/* Feature pills */}
          <div className="mb-6 flex flex-wrap justify-center gap-2 lg:justify-start">
            {PILLS.map((pill) => (
              <div
                key={pill.label}
                className={`hero-pill flex items-center gap-1.5 rounded-full border px-3 py-1.5 opacity-0 ${pill.bg}`}
              >
                <pill.icon className={`size-3.5 ${pill.color}`} />
                <span className="text-xs font-medium text-white/60">{pill.label}</span>
              </div>
            ))}
          </div>

          {/* Social proof */}
          <div className="hero-social flex items-center gap-3 opacity-0">
            {/* Avatar stack */}
            <div className="flex -space-x-2">
              {["#3b82f6", "#a855f7", "#10b981", "#f59e0b"].map((color, i) => (
                <div
                  key={i}
                  className="flex size-7 items-center justify-center rounded-full border-2 border-[#030712] text-[9px] font-bold text-white/80 sm:size-8"
                  style={{ backgroundColor: color }}
                >
                  {["JD", "AK", "MS", "RW"][i]}
                </div>
              ))}
            </div>
            <div className="text-left">
              <div className="text-xs font-medium text-white/60 sm:text-sm">
                Trusted by <span className="text-white/90">2,000+</span> learners
              </div>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className="text-[10px] text-amber-400">★</span>
                ))}
                <span className="ml-1 text-[10px] text-white/30">4.9/5</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: Product Demo ── */}
        <div className="hero-demo relative opacity-0 lg:py-8">
          <ProductDemo />
        </div>
      </div>
    </section>
  );
}
