/**
 * AI Showcase section — two-column layout: marketing copy left,
 * app-like preview with LiVi sidebar chat on the right.
 * Sequential message reveal on scroll.
 */
import { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  PlayCircle,
  FileText,
  HelpCircle,
  Zap,
  User,
  Bot,
  Check,
  Play,
  BookOpen,
  Send,
} from "lucide-react";
import { SparklesText } from "@/components/ui/sparkles-text";
import { ShineBorder } from "@/components/ui/shine-border";
import { BlurFade } from "@/components/ui/blur-fade";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const CHAT_MESSAGES = [
  { role: "user" as const, text: "Explain the Virtual DOM in simple terms" },
  {
    role: "assistant" as const,
    text: "Think of it as a lightweight copy of the real DOM. When state changes, React diffs the two trees and only updates what actually changed — making updates blazing fast ⚡",
  },
  { role: "user" as const, text: "Generate a quick quiz on this" },
  {
    role: "assistant" as const,
    text: "Here are 3 questions I generated from your lesson:\n\n① What is the main purpose of the Virtual DOM?\n② How does React compare virtual trees?\n③ Why is this faster than direct DOM manipulation?",
  },
];

const CAPABILITIES = [
  {
    icon: PlayCircle,
    label: "Video lessons",
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/15",
  },
  {
    icon: FileText,
    label: "Reading notes",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/15",
  },
  {
    icon: HelpCircle,
    label: "Quiz hints",
    color: "text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/15",
  },
  {
    icon: Zap,
    label: "Context-aware",
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/15",
  },
];

const LIVI_FEATURES = [
  "Understands every video, note and quiz in your course",
  "Answers questions with full lesson context",
  "Generates quizzes instantly from any content",
  "Organizes your entire course with one click",
];

/* ─── Lesson sidebar (left pane of the app preview) ─── */
function LessonPane() {
  return (
    <div className="hidden flex-col border-r border-white/[0.04] md:flex md:w-[45%]">
      {/* Video thumbnail area */}
      <div className="relative aspect-video w-full bg-gradient-to-br from-[#0c0c18] to-[#10102a]">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex size-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
            <Play className="ml-0.5 size-4 text-white/70" fill="currentColor" />
          </div>
        </div>
        {/* Fake video progress bar */}
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/[0.06]">
          <div className="h-full w-[42%] bg-blue-500" />
        </div>
        {/* Timestamp */}
        <div className="absolute right-2 bottom-2 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white/60">
          12:34 / 28:15
        </div>
      </div>
      {/* Lesson info */}
      <div className="flex flex-1 flex-col gap-3 p-3.5">
        <div>
          <div className="text-[11px] font-semibold text-white/70">
            Virtual DOM & Reconciliation
          </div>
          <div className="mt-0.5 text-[9px] text-white/30">Section 2 · Lesson 4 of 8</div>
        </div>
        {/* Lesson list */}
        <div className="flex flex-col gap-1">
          {[
            { title: "What is React?", done: true },
            { title: "JSX & Components", done: true },
            { title: "Props & State", done: true },
            { title: "Virtual DOM & Reconciliation", active: true },
            { title: "useEffect & Lifecycle", done: false },
          ].map((lesson) => (
            <div
              key={lesson.title}
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[10px] ${
                lesson.active
                  ? "bg-blue-500/10 font-medium text-blue-400"
                  : lesson.done
                    ? "text-white/30 line-through decoration-white/10"
                    : "text-white/25"
              }`}
            >
              <div
                className={`size-1.5 shrink-0 rounded-full ${
                  lesson.active ? "bg-blue-400" : lesson.done ? "bg-emerald-400/50" : "bg-white/10"
                }`}
              />
              {lesson.title}
            </div>
          ))}
        </div>
        {/* Progress */}
        <div className="mt-auto">
          <div className="flex items-center justify-between text-[9px] text-white/25">
            <span>Course progress</span>
            <span>42%</span>
          </div>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-full w-[42%] rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function AIShowcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visibleMessages, setVisibleMessages] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!sectionRef.current) return;

    const trigger = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: "top 65%",
      once: true,
      onEnter: () => {
        setStarted(true);
        CHAT_MESSAGES.forEach((_, i) => {
          setTimeout(() => setVisibleMessages(i + 1), 700 * (i + 1));
        });
      },
    });

    return () => trigger.kill();
  }, []);

  return (
    <section ref={sectionRef} className="relative overflow-hidden py-24 sm:py-32">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_50%,_rgba(168,85,247,0.08)_0%,_transparent_70%)]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section label */}
        <BlurFade delay={0} inView>
          <div className="mb-12 text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/20 bg-purple-500/5 px-3 py-1 text-xs font-medium text-purple-400">
              <Bot className="size-3" />
              AI Study Companion
            </div>
          </div>
        </BlurFade>

        {/* Two-column layout */}
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.3fr] lg:gap-14">
          {/* LEFT — Copy */}
          <BlurFade delay={0.1} inView>
            <div className="flex flex-col gap-8">
              <div>
                <h2 className="text-3xl leading-tight font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
                  Meet{" "}
                  <SparklesText
                    className="inline text-3xl leading-tight font-bold sm:text-4xl md:text-5xl"
                    colors={{ first: "#a855f7", second: "#3b82f6" }}
                  >
                    LiVi
                  </SparklesText>
                  <br />
                  your AI study
                  <br />
                  <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                    companion.
                  </span>
                </h2>
                <p className="mt-4 text-base leading-relaxed text-white/50 sm:text-lg">
                  LiVi lives inside your course and knows every lesson. It's not a generic chatbot —
                  it reads your content and answers with full context.
                </p>
              </div>

              {/* Feature list */}
              <ul className="flex flex-col gap-3">
                {LIVI_FEATURES.map((feat) => (
                  <li key={feat} className="flex items-start gap-3">
                    <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-purple-500/15">
                      <Check className="size-3 text-purple-400" />
                    </div>
                    <span className="text-sm text-white/60">{feat}</span>
                  </li>
                ))}
              </ul>

              {/* Capability pills */}
              <div className="flex flex-wrap gap-2">
                {CAPABILITIES.map((cap) => (
                  <div
                    key={cap.label}
                    className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${cap.bg} ${cap.color}`}
                  >
                    <cap.icon className="size-3" />
                    {cap.label}
                  </div>
                ))}
              </div>
            </div>
          </BlurFade>

          {/* RIGHT — App preview with sidebar + LiVi chat */}
          <BlurFade delay={0.2} inView>
            <div className="relative rounded-2xl">
              {/* The actual app preview */}
              <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#08080f] shadow-2xl shadow-purple-500/5">
                {/* Top bar */}
                <div className="flex items-center gap-2 border-b border-white/[0.04] px-4 py-2">
                  <div className="flex gap-1.5">
                    <div className="size-2 rounded-full bg-[#ff5f57]" />
                    <div className="size-2 rounded-full bg-[#febc2e]" />
                    <div className="size-2 rounded-full bg-[#28c840]" />
                  </div>
                  <div className="flex-1 rounded-md bg-white/[0.04] px-3 py-1 text-center text-[10px] text-white/20">
                    learnerverse.app/learner/react-fundamentals
                  </div>
                </div>

                {/* Split view: lesson + LiVi sidebar */}
                <div className="flex" style={{ minHeight: 320 }}>
                  {/* Lesson pane */}
                  <LessonPane />

                  {/* LiVi sidebar */}
                  <div className="flex flex-1 flex-col">
                    {/* Chat header */}
                    <div className="flex items-center gap-2.5 border-b border-white/[0.04] px-4 py-2.5">
                      <div className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500 shadow-md shadow-purple-500/20">
                        <Sparkles className="size-3 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[12px] font-semibold text-white">LiVi</p>
                        <p className="text-[9px] text-white/30">
                          Context: Virtual DOM & Reconciliation
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="size-1.5 rounded-full bg-emerald-400" />
                        <span className="text-[9px] font-medium text-emerald-400/70">ready</span>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-3 py-4">
                      {/* Context pill */}
                      <div className="mx-auto flex items-center gap-1.5 rounded-full bg-purple-500/8 px-2.5 py-1 text-[9px] text-purple-400/60">
                        <BookOpen className="size-2.5" />
                        Reading from current lesson
                      </div>

                      {CHAT_MESSAGES.slice(0, visibleMessages).map((msg, i) => (
                        <div
                          key={i}
                          className={`flex items-end gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                          style={{ animation: "fadeSlideUp 0.35s ease-out both" }}
                        >
                          {/* Avatar */}
                          <div
                            className={`mb-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${
                              msg.role === "user"
                                ? "bg-white/10"
                                : "bg-gradient-to-br from-purple-500 to-blue-500"
                            }`}
                          >
                            {msg.role === "user" ? (
                              <User className="size-2 text-white/50" />
                            ) : (
                              <Sparkles className="size-2 text-white" />
                            )}
                          </div>

                          {/* Bubble */}
                          <div
                            className={`max-w-[82%] rounded-2xl px-3 py-2 text-[11px] leading-relaxed ${
                              msg.role === "user"
                                ? "rounded-br-sm bg-gradient-to-br from-blue-600/25 to-blue-500/15 text-blue-100"
                                : "rounded-bl-sm bg-white/[0.05] text-white/65"
                            }`}
                          >
                            {msg.text.split("\n").map((line, j) => (
                              <span key={j}>
                                {line}
                                {j < msg.text.split("\n").length - 1 && <br />}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}

                      {/* Typing indicator */}
                      {started && visibleMessages < CHAT_MESSAGES.length && (
                        <div
                          className="flex items-end gap-2"
                          style={{ animation: "fadeSlideUp 0.35s ease-out both" }}
                        >
                          <div className="mb-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500">
                            <Sparkles className="size-2 text-white" />
                          </div>
                          <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-white/[0.05] px-3 py-2.5">
                            <div className="size-1 animate-bounce rounded-full bg-purple-400 [animation-delay:0ms]" />
                            <div className="size-1 animate-bounce rounded-full bg-purple-400 [animation-delay:150ms]" />
                            <div className="size-1 animate-bounce rounded-full bg-purple-400 [animation-delay:300ms]" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Input bar */}
                    <div className="flex items-center gap-2 border-t border-white/[0.04] px-3 py-2.5">
                      <div className="flex-1 rounded-lg bg-white/[0.04] px-3 py-2 text-[10px] text-white/18">
                        Ask LiVi about this lesson...
                      </div>
                      <button className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 transition-opacity hover:opacity-90">
                        <Send className="size-3 text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ShineBorder as a sibling overlay, NOT a wrapper */}
              <ShineBorder
                shineColor={["#a855f7", "#3b82f6", "#06b6d4"]}
                borderWidth={1.5}
                className="rounded-2xl"
              />
            </div>
          </BlurFade>
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}
