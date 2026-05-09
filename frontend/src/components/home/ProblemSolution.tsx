/**
 * Problem → Solution comparison section.
 *
 * Side-by-side cards: "Without LearnerVerse" (pain) vs
 * "With LearnerVerse" (delight). Uses MagicCard for the
 * cursor-spotlight glow effect.
 */
import { useEffect, useRef } from "react";
import { X, Check, Youtube, Brain } from "lucide-react";
import { MagicCard } from "@/components/ui/magic-card";
import { BlurFade } from "@/components/ui/blur-fade";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const PAIN_POINTS = [
  "Scattered across dozens of browser tabs",
  "No structure or curriculum flow",
  "No quizzes to test understanding",
  "No way to track what you've finished",
  "Learning completely alone",
  "Distracted by recommendations & comments",
] as const;

const SOLUTIONS = [
  "One organized course from any playlist",
  "Sections & lessons with logical flow",
  "AI-generated quizzes after every lesson",
  "Full progress tracking with streaks",
  "LiVi AI companion guides you",
  "Distraction-free focused study mode",
] as const;

export function ProblemSolution() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".ps-card-left",
        { opacity: 0, x: -40 },
        {
          opacity: 1,
          x: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 75%",
          },
        },
      );
      gsap.fromTo(
        ".ps-card-right",
        { opacity: 0, x: 40 },
        {
          opacity: 1,
          x: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 75%",
          },
        },
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Section heading */}
        <BlurFade delay={0} inView>
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
              Learning from YouTube is{" "}
              <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                broken.
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-white/50 sm:text-lg">
              YouTube has incredible educational content. But watching playlists without structure,
              quizzes, or tracking doesn't lead to real learning.
            </p>
          </div>
        </BlurFade>

        {/* Comparison cards */}
        <div className="grid gap-6 md:grid-cols-2 md:gap-8">
          {/* WITHOUT card */}
          <MagicCard
            className="ps-card-left rounded-2xl border border-red-500/10 bg-white/[0.02] p-8 opacity-0"
            gradientColor="rgba(239, 68, 68, 0.08)"
          >
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-red-500/10">
                  <Youtube className="size-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Without LearnerVerse</h3>
                  <p className="text-xs text-white/40">The typical YouTube learning experience</p>
                </div>
              </div>
              <div className="flex flex-col gap-3.5">
                {PAIN_POINTS.map((point, i) => (
                  <BlurFade key={point} delay={0.3 + i * 0.08} inView>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-red-500/10">
                        <X className="size-3 text-red-400" />
                      </div>
                      <span className="text-sm leading-relaxed text-white/60">{point}</span>
                    </div>
                  </BlurFade>
                ))}
              </div>
            </div>
          </MagicCard>

          {/* WITH card */}
          <MagicCard
            className="ps-card-right rounded-2xl border border-blue-500/10 bg-white/[0.02] p-8 opacity-0"
            gradientColor="rgba(59, 130, 246, 0.08)"
          >
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10">
                  <Brain className="size-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">With LearnerVerse</h3>
                  <p className="text-xs text-white/40">An AI-powered structured experience</p>
                </div>
              </div>
              <div className="flex flex-col gap-3.5">
                {SOLUTIONS.map((point, i) => (
                  <BlurFade key={point} delay={0.3 + i * 0.08} inView>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                        <Check className="size-3 text-emerald-400" />
                      </div>
                      <span className="text-sm leading-relaxed text-white/60">{point}</span>
                    </div>
                  </BlurFade>
                ))}
              </div>
            </div>
          </MagicCard>
        </div>
      </div>
    </section>
  );
}
