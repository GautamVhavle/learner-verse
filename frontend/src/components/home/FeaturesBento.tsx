/**
 * Features Bento Grid — 6 product features in an asymmetric
 * Apple-style bento layout. Each card has an icon, title,
 * description, and a small animated visual.
 */
import { useEffect, useRef } from "react";
import {
  Layers,
  Sparkles,
  MessageCircle,
  TrendingUp,
  Globe,
  Award,
  ChevronRight,
  Circle,
} from "lucide-react";
import { BorderBeam } from "@/components/ui/border-beam";
import { BlurFade } from "@/components/ui/blur-fade";
import { Marquee } from "@/components/ui/marquee";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/* ─── Mini visuals inside bento cards ─── */

function CourseTreeVisual() {
  return (
    <div className="mt-4 flex flex-col gap-1.5 rounded-xl border border-white/5 bg-white/[0.02] p-4 font-mono text-[11px]">
      <div className="flex items-center gap-2 text-blue-400">
        <Layers className="size-3.5" /> Introduction to React
      </div>
      <div className="ml-4 flex flex-col gap-1">
        <div className="flex items-center gap-2 text-white/50">
          <div className="size-1.5 rounded-full bg-emerald-400" /> What is React?
        </div>
        <div className="flex items-center gap-2 text-white/50">
          <div className="size-1.5 rounded-full bg-emerald-400" /> JSX Fundamentals
        </div>
        <div className="flex items-center gap-2 text-white/50">
          <div className="size-1.5 rounded-full bg-white/20" /> Component Lifecycle
        </div>
      </div>
      <div className="flex items-center gap-2 text-blue-400">
        <Layers className="size-3.5" /> Advanced Patterns
      </div>
      <div className="ml-4 flex flex-col gap-1">
        <div className="flex items-center gap-2 text-white/50">
          <div className="size-1.5 rounded-full bg-white/20" /> Custom Hooks
        </div>
        <div className="flex items-center gap-2 text-white/50">
          <div className="size-1.5 rounded-full bg-white/20" /> Context API
        </div>
      </div>
    </div>
  );
}

function QuizVisual() {
  return (
    <div className="mt-4 flex flex-col gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <p className="text-xs font-medium text-white/70">What does useState return?</p>
      <div className="flex flex-col gap-1.5">
        {["A promise", "State value & setter", "A ref object", "An event handler"].map((opt, i) => (
          <div
            key={opt}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] ${
              i === 1
                ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border border-white/5 bg-white/[0.02] text-white/40"
            }`}
          >
            <Circle className={`size-2.5 ${i === 1 ? "fill-emerald-400" : ""}`} />
            {opt}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 text-[10px] text-emerald-400">
        <Sparkles className="size-3" /> AI-generated from video content
      </div>
    </div>
  );
}

function ChatVisual() {
  return (
    <div className="mt-4 flex flex-col gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <div className="self-end rounded-lg rounded-br-sm bg-blue-500/15 px-3 py-1.5 text-[11px] text-blue-300">
        Explain useEffect cleanup
      </div>
      <div className="flex items-start gap-2 self-start">
        <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-purple-500/20">
          <Sparkles className="size-2.5 text-purple-400" />
        </div>
        <div className="rounded-lg rounded-bl-sm bg-white/5 px-3 py-1.5 text-[11px] text-white/60">
          The cleanup function runs before the component unmounts or before the effect re-runs...
        </div>
      </div>
      <div className="flex items-center gap-1.5 self-start pl-7">
        <div className="size-1 animate-pulse rounded-full bg-purple-400" />
        <div className="size-1 animate-pulse rounded-full bg-purple-400 [animation-delay:200ms]" />
        <div className="size-1 animate-pulse rounded-full bg-purple-400 [animation-delay:400ms]" />
      </div>
    </div>
  );
}

function ProgressVisual() {
  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-4">
        {[
          { label: "React Basics", pct: 100, color: "bg-emerald-400" },
          { label: "State Management", pct: 72, color: "bg-blue-400" },
          { label: "Server Components", pct: 35, color: "bg-purple-400" },
        ].map((course) => (
          <div key={course.label} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-white/60">{course.label}</span>
              <span className="text-white/40">{course.pct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
              <div
                className={`h-full rounded-full ${course.color} transition-all duration-1000`}
                style={{ width: `${course.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
        <span className="text-[11px] text-white/50">Current streak</span>
        <span className="text-sm font-bold text-orange-400">🔥 12 days</span>
      </div>
    </div>
  );
}

const MINI_COURSES = [
  "Python Mastery",
  "Web Dev Bootcamp",
  "Machine Learning",
  "UI/UX Design",
  "System Design",
  "Docker & K8s",
];

function HubVisual() {
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-white/5">
      <Marquee pauseOnHover className="py-2 [--duration:25s]">
        {MINI_COURSES.map((name) => (
          <div
            key={name}
            className="mx-1.5 flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
          >
            <Globe className="size-3 text-blue-400" />
            <span className="whitespace-nowrap text-[11px] text-white/60">{name}</span>
            <ChevronRight className="size-3 text-white/20" />
          </div>
        ))}
      </Marquee>
    </div>
  );
}

function CertVisual() {
  return (
    <div className="relative mt-4 overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center">
      <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-white/30">
        Certificate of Completion
      </div>
      <Award className="mx-auto size-8 text-amber-400" />
      <div className="mt-2 text-xs font-semibold text-white/70">React Mastery</div>
      <div className="mt-0.5 text-[10px] text-white/30">Awarded to Jane Doe</div>
      <BorderBeam size={100} duration={8} colorFrom="#f59e0b" colorTo="#a855f7" />
    </div>
  );
}

/* ─── Feature data ─── */
interface Feature {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  visual: React.ReactNode;
  className: string; // grid span
}

const FEATURES: Feature[] = [
  {
    icon: Layers,
    iconColor: "text-blue-400",
    iconBg: "bg-blue-500/10",
    title: "Visual Course Builder",
    description:
      "Drag-and-drop sections and lessons. Import YouTube videos instantly. Organize everything with AI assistance.",
    visual: <CourseTreeVisual />,
    className: "md:col-span-2",
  },
  {
    icon: Sparkles,
    iconColor: "text-purple-400",
    iconBg: "bg-purple-500/10",
    title: "AI Quiz Generation",
    description:
      "Generate multi-choice quizzes from any video or note with one click. LiVi analyzes the content and creates tailored questions.",
    visual: <QuizVisual />,
    className: "md:col-span-1",
  },
  {
    icon: MessageCircle,
    iconColor: "text-emerald-400",
    iconBg: "bg-emerald-500/10",
    title: "LiVi AI Chat",
    description:
      "Ask LiVi about any lesson. Get instant explanations, hints, and deeper understanding — right where you study.",
    visual: <ChatVisual />,
    className: "md:col-span-1",
  },
  {
    icon: TrendingUp,
    iconColor: "text-orange-400",
    iconBg: "bg-orange-500/10",
    title: "Progress & Streaks",
    description:
      "Track every lesson, quiz score, and study session. Build daily streaks and see your growth over time.",
    visual: <ProgressVisual />,
    className: "md:col-span-2",
  },
  {
    icon: Globe,
    iconColor: "text-cyan-400",
    iconBg: "bg-cyan-500/10",
    title: "Course Hub",
    description:
      "Discover community courses published by creators. Enroll, rate, and learn from curated YouTube curricula.",
    visual: <HubVisual />,
    className: "md:col-span-2",
  },
  {
    icon: Award,
    iconColor: "text-amber-400",
    iconBg: "bg-amber-500/10",
    title: "Certificates",
    description:
      "Earn verifiable certificates when you complete a course. Share them with a unique public link.",
    visual: <CertVisual />,
    className: "md:col-span-1",
  },
];

/* ─── Main component ─── */

export function FeaturesBento() {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gridRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".bento-card",
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: gridRef.current,
            start: "top 80%",
          },
        }
      );
    }, gridRef);

    return () => ctx.revert();
  }, []);

  return (
    <section id="features" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Section heading */}
        <BlurFade delay={0} inView>
          <div className="mb-16 text-center">
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/60">
              <Sparkles className="size-3 text-purple-400" />
              Packed with Features
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
              Everything you need to{" "}
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                learn effectively.
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-white/50 sm:text-lg">
              From building courses to earning certificates — every tool
              is designed to maximize your learning from YouTube content.
            </p>
          </div>
        </BlurFade>

        {/* Bento grid */}
        <div ref={gridRef} className="grid gap-4 md:grid-cols-3 md:gap-5">
          {FEATURES.map((feat) => (
            <div
              key={feat.title}
              className={`bento-card group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 opacity-0 transition-all duration-300 hover:-translate-y-1 hover:border-white/10 hover:bg-white/[0.04] ${feat.className}`}
            >
              <div className="flex items-center gap-3">
                <div className={`flex size-9 items-center justify-center rounded-xl ${feat.iconBg}`}>
                  <feat.icon className={`size-4.5 ${feat.iconColor}`} />
                </div>
                <h3 className="text-base font-semibold text-white">{feat.title}</h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-white/45">
                {feat.description}
              </p>
              {feat.visual}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
