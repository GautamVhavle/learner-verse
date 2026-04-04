/**
 * Final CTA Section — gradient background with bold headline
 * and a large shimmer button for conversion. The last push.
 */
import { useNavigate } from "react-router";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMode } from "@/hooks/useMode";
import { SINGLE_USER_MODE } from "@/lib/auth";
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { BlurFade } from "@/components/ui/blur-fade";

export function CTASection() {
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();
  const { mode } = useMode();

  const handleCTA = () => {
    if (SINGLE_USER_MODE || isSignedIn) {
      navigate(mode === "creator" ? "/creator" : "/learner");
    } else {
      navigate("/login");
    }
  };

  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      {/* Gradient background */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/[0.06] to-purple-500/[0.06]" />
      <div className="pointer-events-none absolute inset-0">
        <AnimatedGridPattern
          numSquares={30}
          maxOpacity={0.05}
          duration={4}
          className="absolute inset-0 [mask-image:radial-gradient(500px_circle_at_center,white,transparent)]"
        />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-4 text-center sm:px-6">
        <BlurFade delay={0} inView>
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl">
            Ready to transform
            <br />
            how you learn?
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base text-white/50 sm:text-lg">
            Start building AI-powered courses from YouTube videos
            — completely free. No credit card required.
          </p>
        </BlurFade>

        <BlurFade delay={0.15} inView>
          <div className="mt-10">
            <ShimmerButton
              onClick={handleCTA}
              shimmerColor="#a855f7"
              shimmerSize="0.1em"
              background="linear-gradient(135deg, #3b82f6 0%, #a855f7 100%)"
              borderRadius="14px"
              className="inline-flex h-14 px-10 text-lg font-semibold"
            >
              <span className="flex items-center gap-2.5 text-white">
                {isSignedIn ? "Go to Dashboard" : "Get Started Now"}
                <ArrowRight className="size-5" />
              </span>
            </ShimmerButton>
          </div>
          <p className="mt-4 text-xs text-white/30">
            Free forever for individual learners. No setup required.
          </p>
        </BlurFade>
      </div>
    </section>
  );
}
