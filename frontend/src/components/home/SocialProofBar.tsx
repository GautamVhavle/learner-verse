/**
 * Social proof bar — animated stat counters that build credibility.
 * Numbers count up when the section scrolls into view.
 */
import { useEffect, useRef, useState } from "react";
import { BookOpen, Users, Layers, Sparkles } from "lucide-react";
import { NumberTicker } from "@/components/ui/number-ticker";
import { BlurFade } from "@/components/ui/blur-fade";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const STATS = [
  { icon: BookOpen, value: 500, suffix: "+", label: "Courses Created" },
  { icon: Layers, value: 10000, suffix: "+", label: "Lessons Built" },
  { icon: Users, value: 2000, suffix: "+", label: "Active Learners" },
  { icon: Sparkles, value: 50000, suffix: "+", label: "Quizzes Generated" },
] as const;

export function SocialProofBar() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!sectionRef.current) return;

    const trigger = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: "top 85%",
      once: true,
      onEnter: () => setVisible(true),
    });

    return () => trigger.kill();
  }, []);

  return (
    <div ref={sectionRef} className="relative border-y border-white/5 bg-[#030712] py-12">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 px-4 sm:gap-8 sm:px-6 md:grid-cols-4 lg:gap-12">
        {STATS.map((stat, i) => (
          <BlurFade key={stat.label} delay={i * 0.1} inView>
            <div className="flex flex-col items-center gap-2 text-center">
              <stat.icon className="mb-1 size-5 text-white/30" />
              <div className="flex items-baseline gap-0.5">
                {visible ? (
                  <NumberTicker
                    value={stat.value}
                    className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
                  />
                ) : (
                  <span className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                    0
                  </span>
                )}
                <span className="text-xl font-semibold text-blue-400 sm:text-2xl">
                  {stat.suffix}
                </span>
              </div>
              <span className="text-xs font-medium tracking-wider text-white/40 uppercase">
                {stat.label}
              </span>
            </div>
          </BlurFade>
        ))}
      </div>
    </div>
  );
}
