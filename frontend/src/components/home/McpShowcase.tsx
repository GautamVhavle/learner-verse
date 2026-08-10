import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { motion, useInView, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Code2,
  FileJson,
  KeyRound,
  Loader2,
  Play,
  Rocket,
  Server,
  ShieldCheck,
  Sparkles,
  Terminal,
} from "lucide-react";
import { BlurFade } from "@/components/ui/blur-fade";
import { BorderBeam } from "@/components/ui/border-beam";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { SINGLE_USER_MODE } from "@/lib/auth";

const WORKFLOW_STEPS = [
  {
    tool: "get_capabilities",
    label: "Agent discovers available tools",
    icon: Server,
    color: "text-cyan-400",
    glow: "bg-cyan-400",
  },
  {
    tool: "validate_course_spec",
    label: "Structure and assets are checked",
    icon: FileJson,
    color: "text-blue-400",
    glow: "bg-blue-400",
  },
  {
    tool: "build_course_from_spec",
    label: "Lessons, readings and quizzes are built",
    icon: Sparkles,
    color: "text-purple-400",
    glow: "bg-purple-400",
  },
  {
    tool: "get_course_for_review",
    label: "The finished draft returns for approval",
    icon: Rocket,
    color: "text-emerald-400",
    glow: "bg-emerald-400",
  },
] as const;

const CLIENTS = ["VS Code", "Codex", "Claude Code", "Cursor", "OpenCode"] as const;

function WorkflowStep({
  step,
  index,
  activeStep,
}: {
  step: (typeof WORKFLOW_STEPS)[number];
  index: number;
  activeStep: number;
}) {
  const complete = index < activeStep;
  const active = index === activeStep;

  return (
    <motion.div
      animate={{ opacity: index <= activeStep ? 1 : 0.42, y: active ? -1 : 0 }}
      transition={{ duration: 0.35 }}
      className={`relative flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors sm:px-4 ${
        active ? "border-white/[0.12] bg-white/[0.055]" : "border-white/[0.045] bg-white/[0.018]"
      }`}
    >
      <div
        className={`relative flex size-8 shrink-0 items-center justify-center rounded-lg border ${
          complete || active
            ? "border-white/10 bg-white/[0.06]"
            : "border-white/[0.05] bg-white/[0.02]"
        }`}
      >
        {complete ? (
          <Check className="size-3.5 text-emerald-400" />
        ) : active ? (
          <Loader2 className={`size-3.5 animate-spin ${step.color}`} />
        ) : (
          <step.icon className="size-3.5 text-white/20" />
        )}
        {active && (
          <motion.span
            layoutId="mcp-active-glow"
            className={`absolute -left-[5px] size-1.5 rounded-full ${step.glow} shadow-[0_0_10px_currentColor]`}
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <code className={`block truncate text-[11px] font-semibold sm:text-xs ${step.color}`}>
          {step.tool}
        </code>
        <p className="mt-0.5 truncate text-[10px] text-white/35 sm:text-[11px]">{step.label}</p>
      </div>

      <span className="hidden text-[10px] text-white/25 sm:block">
        {complete ? "done" : active ? "running" : "queued"}
      </span>
    </motion.div>
  );
}

function McpWorkflowDemo() {
  const demoRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(demoRef, { amount: 0.35 });
  const reduceMotion = useReducedMotion();
  const [animatedStep, setAnimatedStep] = useState(0);
  const activeStep = reduceMotion ? WORKFLOW_STEPS.length : animatedStep;

  useEffect(() => {
    if (reduceMotion) {
      return;
    }
    if (!isInView) return;

    const timer = window.setInterval(() => {
      setAnimatedStep((current) => (current >= WORKFLOW_STEPS.length ? 0 : current + 1));
    }, 1_450);

    return () => window.clearInterval(timer);
  }, [isInView, reduceMotion]);

  const courseReady = activeStep >= WORKFLOW_STEPS.length;

  return (
    <div ref={demoRef} className="relative mx-auto w-full max-w-2xl">
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.09] bg-[#080b16] shadow-2xl shadow-blue-500/[0.08]">
        <BorderBeam size={280} duration={11} colorFrom="#22d3ee" colorTo="#a855f7" />

        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5" aria-hidden="true">
              <span className="size-2 rounded-full bg-red-400/70" />
              <span className="size-2 rounded-full bg-amber-400/70" />
              <span className="size-2 rounded-full bg-emerald-400/70" />
            </div>
            <span className="ml-1 text-[11px] font-medium text-white/35">IDE agent</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/15 bg-emerald-500/[0.07] px-2 py-1">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
            <span className="text-[10px] font-medium text-emerald-300">LearnerVerse connected</span>
          </div>
        </div>

        <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="border-b border-white/[0.06] p-4 sm:p-5 lg:border-r lg:border-b-0">
            <div className="flex items-start gap-3 rounded-xl border border-blue-500/15 bg-blue-500/[0.055] p-3.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                <Terminal className="size-4 text-blue-400" />
              </div>
              <div>
                <div className="mb-1 text-[10px] font-semibold tracking-[0.16em] text-blue-300/60 uppercase">
                  Your prompt
                </div>
                <p className="text-xs leading-relaxed text-white/75 sm:text-sm">
                  Build a Docker essentials course with 10 videos, reading lessons, quizzes and a
                  polished thumbnail. Keep it as a draft for my review.
                </p>
              </div>
            </div>

            <div className="my-4 flex items-center gap-2 text-[10px] font-medium tracking-[0.14em] text-white/25 uppercase">
              <span className="h-px flex-1 bg-white/[0.05]" />
              Permissioned tool calls
              <span className="h-px flex-1 bg-white/[0.05]" />
            </div>

            <div className="space-y-2">
              {WORKFLOW_STEPS.map((step, index) => (
                <WorkflowStep key={step.tool} step={step} index={index} activeStep={activeStep} />
              ))}
            </div>
          </div>

          <div className="flex min-h-72 flex-col p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[10px] font-semibold tracking-[0.15em] text-white/30 uppercase">
                Course output
              </span>
              <motion.span
                animate={{ opacity: courseReady ? 1 : 0.45 }}
                className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${
                  courseReady
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                    : "border-amber-500/15 bg-amber-500/[0.07] text-amber-300/70"
                }`}
              >
                {courseReady ? "Ready for review" : "Building draft"}
              </motion.span>
            </div>

            <motion.div
              animate={{ opacity: activeStep >= 2 ? 1 : 0.35, scale: activeStep >= 2 ? 1 : 0.985 }}
              className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.025]"
            >
              <div className="h-20 bg-[radial-gradient(circle_at_25%_20%,_rgba(34,211,238,0.24),_transparent_35%),radial-gradient(circle_at_75%_75%,_rgba(168,85,247,0.24),_transparent_40%),linear-gradient(135deg,#0b1220,#11102a)] p-3">
                <div className="flex h-full items-end justify-between">
                  <div>
                    <span className="rounded bg-black/25 px-1.5 py-0.5 text-[9px] font-semibold tracking-wider text-cyan-200 uppercase">
                      Docker
                    </span>
                    <p className="mt-1 text-xs font-bold text-white">Containers to deployment</p>
                  </div>
                  <Code2 className="size-7 text-white/15" />
                </div>
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-white/65">Docker Essentials</span>
                  <CheckCircle2
                    className={`size-3.5 ${courseReady ? "text-emerald-400" : "text-white/15"}`}
                  />
                </div>
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {[
                    ["5", "sections"],
                    ["20", "lessons"],
                    ["3", "quizzes"],
                  ].map(([value, label]) => (
                    <div
                      key={label}
                      className="rounded-lg bg-white/[0.035] px-2 py-1.5 text-center"
                    >
                      <div className="text-xs font-semibold text-white/70">{value}</div>
                      <div className="text-[9px] text-white/25">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            <div className="mt-auto pt-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[10px] text-white/35">
                  <ShieldCheck className="size-3.5 text-emerald-400/70" />
                  Nothing publishes until you approve it
                </div>
                <motion.span
                  animate={{ opacity: courseReady ? 1 : 0.3 }}
                  className="shrink-0 rounded-md bg-emerald-500/10 px-2 py-1 text-[9px] font-semibold text-emerald-300"
                >
                  Approve & publish
                </motion.span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.05]">
                <motion.div
                  animate={{ width: `${Math.min(activeStep / WORKFLOW_STEPS.length, 1) * 100}%` }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {CLIENTS.map((client) => (
          <span
            key={client}
            className="rounded-full border border-white/[0.06] bg-white/[0.025] px-2.5 py-1 text-[10px] font-medium text-white/35"
          >
            {client}
          </span>
        ))}
        <span className="text-[10px] text-white/20">and any MCP client</span>
      </div>
    </div>
  );
}

export function McpShowcase() {
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();

  const openMcpGuide = () => {
    navigate(SINGLE_USER_MODE || isSignedIn ? "/creator/mcp" : "/login");
  };

  return (
    <section id="mcp" className="relative overflow-hidden py-20 sm:py-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_65%_55%_at_70%_45%,_rgba(34,211,238,0.07)_0%,_transparent_68%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_45%_50%_at_20%_55%,_rgba(139,92,246,0.055)_0%,_transparent_70%)]" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:gap-16 xl:gap-20">
        <BlurFade delay={0} inView>
          <div className="max-w-xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/[0.06] px-3.5 py-1.5">
              <Terminal className="size-3.5 text-cyan-400" />
              <span className="text-xs font-medium text-cyan-200">Model Context Protocol</span>
              <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-white/35 uppercase">
                MCP
              </span>
            </div>

            <h2 className="text-3xl leading-tight font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
              Build the whole course{" "}
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                from your IDE.
              </span>
            </h2>
            <p className="mt-5 text-base leading-relaxed text-white/55 sm:text-lg">
              Connect your AI agent to LearnerVerse once, describe the course you want, and let it
              create the sections, lessons, readings, quizzes, assets and metadata through secure
              MCP tools.
            </p>

            <div className="mt-7 space-y-3">
              {[
                {
                  icon: KeyRound,
                  title: "One permission-scoped API key",
                  text: "You control exactly what your IDE can read, build or publish.",
                },
                {
                  icon: ShieldCheck,
                  title: "Draft first, publish when ready",
                  text: "Validation and review stay between the agent and a live course.",
                },
                {
                  icon: Code2,
                  title: "No course files to commit",
                  text: "Your agent works directly with your hosted LearnerVerse workspace.",
                },
              ].map((benefit) => (
                <div key={benefit.title} className="flex gap-3">
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03]">
                    <benefit.icon className="size-3.5 text-cyan-400/80" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white/80">{benefit.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-white/40">{benefit.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={openMcpGuide}
                className="h-11 gap-2 rounded-xl bg-white px-5 font-semibold text-[#030712] hover:bg-white/90"
              >
                Connect your IDE
                <ArrowRight className="size-4" />
              </Button>
              <button
                onClick={() =>
                  document.querySelector("#mcp-demo")?.scrollIntoView({ behavior: "smooth" })
                }
                className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-5 text-sm font-medium text-white/55 transition-colors hover:border-white/15 hover:bg-white/[0.05] hover:text-white/80"
              >
                <Play className="size-3.5" />
                Watch the workflow
              </button>
            </div>
          </div>
        </BlurFade>

        <BlurFade delay={0.12} inView>
          <div id="mcp-demo" className="scroll-mt-24">
            <McpWorkflowDemo />
          </div>
        </BlurFade>
      </div>
    </section>
  );
}
