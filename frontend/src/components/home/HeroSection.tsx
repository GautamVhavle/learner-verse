/**
 * Hero section — the first viewport of the landing page.
 *
 * Full-screen height with animated grid background, bold headline
 * with rotating words, CTAs, and a floating Safari browser mockup.
 * GSAP powers all entrance animations and subtle mouse parallax.
 */
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { ArrowRight, Play } from "lucide-react";
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import { WordRotate } from "@/components/ui/word-rotate";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { BorderBeam } from "@/components/ui/border-beam";
import { useAuth } from "@/hooks/useAuth";
import { useMode } from "@/hooks/useMode";
import { SINGLE_USER_MODE } from "@/lib/auth";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

function DashboardPreview() {
  return (
    <div className="bg-[#08080f]">
      {/* Browser chrome */}
      <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-2.5">
        <div className="flex gap-1.5">
          <div className="size-2.5 rounded-full bg-[#ff5f57]" />
          <div className="size-2.5 rounded-full bg-[#febc2e]" />
          <div className="size-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex-1 rounded-md bg-white/[0.05] px-3 py-1 text-center text-[11px] text-white/25">
          learnerverse.app/creator/dashboard
        </div>
      </div>
      {/* App layout */}
      <div className="flex h-80">
        {/* Sidebar */}
        <div className="hidden w-44 shrink-0 flex-col gap-0.5 border-r border-white/[0.06] p-3 sm:flex">
          <div className="mb-3 flex items-center gap-2 px-2">
            <div className="size-5 rounded-md bg-gradient-to-br from-blue-500 to-purple-500" />
            <span className="text-[11px] font-semibold text-white/60">LearnerVerse</span>
          </div>
          {["Dashboard", "My Courses", "Course Hub", "AI Tools", "Analytics", "Settings"].map(
            (item, i) => (
              <div
                key={item}
                className={`rounded-md px-2.5 py-1.5 text-[11px] ${
                  i === 0
                    ? "bg-white/[0.06] font-medium text-white/70"
                    : "text-white/25"
                }`}
              >
                {item}
              </div>
            ),
          )}
        </div>
        {/* Main content */}
        <div className="flex-1 overflow-hidden p-5">
          <div className="mb-1 text-[13px] font-semibold text-white/60">
            Good morning, Jane 👋
          </div>
          <div className="mb-4 text-[10px] text-white/25">Here's your learning overview</div>
          {/* Stat cards */}
          <div className="mb-5 grid grid-cols-3 gap-2.5">
            {[
              { label: "Active Courses", value: "12", sub: "+2 this week", gradient: "from-blue-500/15 to-blue-600/5", accent: "text-blue-400" },
              { label: "Completion", value: "85%", sub: "↑ 12% vs last month", gradient: "from-emerald-500/15 to-emerald-600/5", accent: "text-emerald-400" },
              { label: "Study Streak", value: "🔥 7d", sub: "Personal best!", gradient: "from-amber-500/15 to-amber-600/5", accent: "text-amber-400" },
            ].map((s) => (
              <div key={s.label} className={`rounded-xl bg-gradient-to-br ${s.gradient} border border-white/[0.04] p-3`}>
                <div className={`text-sm font-bold ${s.accent}`}>{s.value}</div>
                <div className="text-[10px] text-white/35">{s.label}</div>
                <div className="mt-1 text-[8px] text-white/20">{s.sub}</div>
              </div>
            ))}
          </div>
          {/* Course progress list */}
          <div className="mb-2 text-[10px] font-medium text-white/30">Recent Courses</div>
          <div className="flex flex-col gap-1.5">
            {[
              { name: "React & Next.js Mastery", pct: 85, color: "bg-blue-400" },
              { name: "Python for Machine Learning", pct: 62, color: "bg-purple-400" },
              { name: "System Design Interviews", pct: 34, color: "bg-emerald-400" },
            ].map((c) => (
              <div key={c.name} className="flex items-center gap-3 rounded-lg border border-white/[0.04] bg-white/[0.015] px-3 py-2">
                <div className={`size-1.5 rounded-full ${c.color}`} />
                <span className="flex-1 truncate text-[11px] text-white/45">{c.name}</span>
                <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className={`h-full rounded-full ${c.color}`} style={{ width: `${c.pct}%` }} />
                </div>
                <span className="w-7 text-right text-[10px] text-white/25">{c.pct}%</span>
              </div>
            ))}
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
  const mockupRef = useRef<HTMLDivElement>(null);

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

      tl.fromTo(".hero-badge", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6 })
        .fromTo(".hero-headline", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.7 }, "-=0.3")
        .fromTo(".hero-subtext", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6 }, "-=0.3")
        .fromTo(".hero-cta", { opacity: 0, y: 20, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.12 }, "-=0.2")
        .fromTo(".hero-mockup", { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 1 }, "-=0.3");

      // Parallax on mockup: float up as user scrolls
      if (mockupRef.current) {
        gsap.to(mockupRef.current, {
          y: -40,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top top",
            end: "bottom top",
            scrub: 1,
          },
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  // Mouse-move parallax on mockup
  useEffect(() => {
    if (!mockupRef.current) return;

    const xTo = gsap.quickTo(mockupRef.current, "x", { duration: 0.6, ease: "power2.out" });

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX } = e;
      const { innerWidth } = window;
      xTo((clientX / innerWidth - 0.5) * 30);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 pt-16"
    >
      {/* Background layers */}
      <div className="pointer-events-none absolute inset-0">
        {/* Radial gradient glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(59,130,246,0.15)_0%,_rgba(168,85,247,0.08)_40%,_transparent_70%)]" />
        {/* Grid pattern */}
        <AnimatedGridPattern
          numSquares={40}
          maxOpacity={0.08}
          duration={4}
          className="absolute inset-0 [mask-image:radial-gradient(600px_circle_at_center,white,transparent)]"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center text-center">
        {/* Badge */}
        <div className="hero-badge mb-6 opacity-0">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm backdrop-blur-sm">
            <AnimatedShinyText className="text-white/80">
              <span className="mr-1">✨</span> AI-Powered Learning Platform
            </AnimatedShinyText>
          </div>
        </div>

        {/* Headline */}
        <div className="hero-headline mb-6 opacity-0">
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
            Turn Any{" "}
            <WordRotate
              words={["YouTube Playlist", "Video Collection", "Knowledge Library"]}
              duration={3000}
              className="inline-block bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"
            />
            <br />
            Into a Complete Learning
            <br />
            Experience.
          </h1>
        </div>

        {/* Subtext */}
        <p className="hero-subtext mb-10 max-w-2xl text-base leading-relaxed text-white/50 opacity-0 sm:text-lg md:text-xl">
          Build structured courses, generate AI quizzes, track your progress,
          and learn with LiVi — your intelligent study companion. All from
          YouTube.
        </p>

        {/* CTAs */}
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <ShimmerButton
            onClick={handleCTA}
            shimmerColor="#a855f7"
            shimmerSize="0.08em"
            background="linear-gradient(135deg, #3b82f6 0%, #a855f7 100%)"
            borderRadius="12px"
            className="hero-cta h-12 px-8 text-base font-semibold opacity-0"
          >
            <span className="flex items-center gap-2 text-white">
              {isSignedIn ? "Go to Dashboard" : "Get Started Free"}
              <ArrowRight className="size-4" />
            </span>
          </ShimmerButton>
          <button
            onClick={() => {
              document.querySelector("#how-it-works")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="hero-cta flex h-12 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 text-sm font-medium text-white/70 opacity-0 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
          >
            <Play className="size-3.5" />
            See How It Works
          </button>
        </div>

        {/* Dashboard mockup */}
        <div ref={mockupRef} className="hero-mockup relative mt-16 w-full max-w-4xl opacity-0 sm:mt-20">
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] shadow-2xl shadow-blue-500/10">
            <DashboardPreview />
            <BorderBeam
              size={300}
              duration={15}
              delay={2}
              colorFrom="#3b82f6"
              colorTo="#a855f7"
            />
          </div>
          {/* Bottom fade-out */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#030712] to-transparent" />
        </div>
      </div>
    </section>
  );
}
