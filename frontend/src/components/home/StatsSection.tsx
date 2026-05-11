/**
 * Why LearnerVerse section with honest, verifiable platform highlights.
 *
 * Replaced fabricated metrics with real product differentiators
 * that don't claim unverified numbers.
 */
import { Shield, DollarSign, Server, Cpu } from "lucide-react";
import { BlurFade } from "@/components/ui/blur-fade";

const HIGHLIGHTS = [
  {
    icon: DollarSign,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-400",
    title: "100% Free",
    description: "No hidden costs or paywalls for core features. Learn without limits.",
  },
  {
    icon: Shield,
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-400",
    title: "Open Source",
    description: "Fully transparent codebase. Inspect, contribute, or self-host.",
  },
  {
    icon: Cpu,
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-400",
    title: "AI at Every Step",
    description: "Quizzes, course organization, and a study companion built in.",
  },
  {
    icon: Server,
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-400",
    title: "Self-Hostable",
    description: "Deploy on your own infrastructure. Full control over your data.",
  },
] as const;

export function StatsSection() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <BlurFade delay={0} inView>
          <h2 className="mb-4 text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Why{" "}
            <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              LearnerVerse?
            </span>
          </h2>
          <p className="mx-auto mb-14 max-w-xl text-center text-base text-white/55">
            A learning platform that respects your time, your wallet, and your privacy.
          </p>
        </BlurFade>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-4 md:gap-6">
          {HIGHLIGHTS.map((item, i) => (
            <BlurFade key={item.title} delay={i * 0.1} inView>
              <div className="flex flex-col items-center rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-center transition-colors hover:border-white/10 hover:bg-white/[0.04]">
                <div
                  className={`mb-4 flex size-12 items-center justify-center rounded-xl ${item.iconBg}`}
                >
                  <item.icon className={`size-5 ${item.iconColor}`} />
                </div>
                <h3 className="mb-1.5 text-sm font-semibold text-white">{item.title}</h3>
                <p className="text-xs leading-relaxed text-white/45">{item.description}</p>
              </div>
            </BlurFade>
          ))}
        </div>
      </div>
    </section>
  );
}
