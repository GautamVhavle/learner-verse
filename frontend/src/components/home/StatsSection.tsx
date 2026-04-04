/**
 * Stats Section — large animated number tickers showing
 * platform impact metrics. Triggered on scroll into view.
 */
import { useEffect, useRef, useState } from "react";
import { NumberTicker } from "@/components/ui/number-ticker";
import { BlurFade } from "@/components/ui/blur-fade";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const STATS = [
  { value: 98, suffix: "%", label: "Completion Rate", description: "vs 12% on raw YouTube" },
  { value: 3, suffix: "×", label: "Faster Learning", description: "with AI-powered structure" },
  { value: 10000, suffix: "+", label: "Study Hours Logged", description: "across all learners" },
  { value: 4.9, suffix: "/5", label: "Learner Satisfaction", description: "average course rating", decimals: 1 },
] as const;

export function StatsSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!sectionRef.current) return;

    const trigger = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: "top 80%",
      once: true,
      onEnter: () => setVisible(true),
    });

    return () => trigger.kill();
  }, []);

  return (
    <section ref={sectionRef} className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <BlurFade delay={0} inView>
          <h2 className="mb-4 text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Built for{" "}
            <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              serious learners.
            </span>
          </h2>
          <p className="mx-auto mb-14 max-w-xl text-center text-base text-white/50">
            Real numbers from real learners using LearnerVerse every day.
          </p>
        </BlurFade>

        <div className="grid grid-cols-2 gap-6 px-2 md:grid-cols-4 md:gap-12">
          {STATS.map((stat, i) => (
            <BlurFade key={stat.label} delay={i * 0.1} inView>
              <div className="flex flex-col items-center text-center">
                <div className="flex items-baseline gap-0.5">
                  {visible ? (
                    <NumberTicker
                      value={stat.value}
                      decimalPlaces={"decimals" in stat ? stat.decimals : 0}
                      className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl"
                    />
                  ) : (
                    <span className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">0</span>
                  )}
                  <span className="text-xl font-bold text-blue-400 sm:text-2xl md:text-3xl">
                    {stat.suffix}
                  </span>
                </div>
                <span className="mt-2 text-sm font-semibold text-white/70">
                  {stat.label}
                </span>
                <span className="mt-0.5 text-xs text-white/30">
                  {stat.description}
                </span>
              </div>
            </BlurFade>
          ))}
        </div>
      </div>
    </section>
  );
}
