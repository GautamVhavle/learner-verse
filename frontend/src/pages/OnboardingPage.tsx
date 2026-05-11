/**
 * Multi-step onboarding wizard shown on first login.
 */
import { useState, useCallback } from "react";
import {
  GraduationCap,
  LayoutDashboard,
  ArrowLeftRight,
  Sparkles,
  ArrowRight,
  Check,
  BookOpen,
  Target,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUpdateUserMutation } from "@/hooks/useUser";

const STEPS = [
  {
    id: "welcome",
    title: "Welcome to Learner Verse",
    subtitle: "Your personal learning platform for YouTube courses",
    description:
      "Import YouTube playlists, organize them into structured courses, track your progress, and earn certificates - all in one beautiful space.",
    icon: GraduationCap,
    color: "text-accent-blue",
    bg: "bg-accent-blue/10",
    features: [
      { icon: BookOpen, label: "Import YouTube playlists as courses" },
      { icon: Target, label: "Set goals and track your learning pace" },
      { icon: Award, label: "Earn certificates on completion" },
    ],
  },
  {
    id: "dashboard",
    title: "Your Dashboard",
    subtitle: "Everything starts here",
    description:
      "The dashboard shows all your courses at a glance. Create new courses, continue learning, and see your progress - always one click away.",
    icon: LayoutDashboard,
    color: "text-accent-green",
    bg: "bg-accent-green/10",
    features: [
      { icon: Sparkles, label: "Quick overview of all your courses" },
      { icon: Target, label: "Track streaks & learning stats" },
      { icon: BookOpen, label: "Jump back into where you left off" },
    ],
  },
  {
    id: "modes",
    title: "Two Modes, One App",
    subtitle: "Creator & Learner modes",
    description:
      "Switch between Creator mode to build and organize courses, and Learner mode to study and track your progress. Use the toggle in the sidebar anytime.",
    icon: ArrowLeftRight,
    color: "text-accent-purple",
    bg: "bg-accent-purple/10",
    features: [
      { icon: Sparkles, label: "Creator: Build & organize course content" },
      { icon: BookOpen, label: "Learner: Study, track, and earn certificates" },
      { icon: ArrowLeftRight, label: "Switch modes instantly from the sidebar" },
    ],
  },
] as const;

export default function OnboardingPage({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const update = useUpdateUserMutation();

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const handleNext = useCallback(() => {
    if (isLast) {
      update.mutate({ onboarding_complete: true }, { onSuccess: onComplete });
    } else {
      setStep((s) => s + 1);
    }
  }, [isLast, update, onComplete]);

  const handleSkip = useCallback(() => {
    update.mutate({ onboarding_complete: true }, { onSuccess: onComplete });
  }, [update, onComplete]);

  const Icon = current.icon;

  return (
    <div className="bg-bg-root flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-lg" data-testid="onboarding">
        {/* Card */}
        <div className="border-border-default bg-bg-primary relative overflow-hidden rounded-2xl border shadow-2xl">
          {/* Gradient accent top */}
          <div className="from-accent-blue via-accent-purple to-accent-green h-1 bg-gradient-to-r" />

          <div className="p-8 sm:p-10">
            {/* Icon */}
            <div
              className={`mb-6 inline-flex size-14 items-center justify-center rounded-2xl ${current.bg}`}
            >
              <Icon className={`size-7 ${current.color}`} />
            </div>

            {/* Title & Description */}
            <h1
              className="text-text-primary text-2xl font-bold tracking-tight"
              data-testid="onboarding-title"
            >
              {current.title}
            </h1>
            <p className="text-text-secondary mt-1 text-sm font-medium">{current.subtitle}</p>
            <p className="text-text-secondary mt-3 text-sm leading-relaxed">
              {current.description}
            </p>

            {/* Feature list */}
            <div className="mt-6 space-y-3">
              {current.features.map((f) => (
                <div
                  key={f.label}
                  className="bg-bg-secondary flex items-center gap-3 rounded-lg px-3 py-2.5"
                >
                  <div className="bg-bg-tertiary flex size-8 shrink-0 items-center justify-center rounded-lg">
                    <f.icon className="text-text-secondary size-4" />
                  </div>
                  <span className="text-text-primary text-sm">{f.label}</span>
                </div>
              ))}
            </div>

            {/* Navigation */}
            <div className="mt-8 flex items-center justify-between">
              <button
                onClick={handleSkip}
                className="text-text-tertiary hover:text-text-secondary text-xs transition-colors"
                data-testid="onboarding-skip"
              >
                Skip
              </button>

              <div className="flex items-center gap-4">
                {/* Step indicators */}
                <div className="flex gap-1.5">
                  {STEPS.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === step
                          ? "bg-accent-blue w-6"
                          : i < step
                            ? "bg-accent-blue/40 w-1.5"
                            : "bg-bg-tertiary w-1.5"
                      }`}
                    />
                  ))}
                </div>

                <Button
                  onClick={handleNext}
                  className="gap-2"
                  disabled={update.isPending}
                  data-testid="onboarding-next"
                >
                  {isLast ? (
                    <>
                      Get Started
                      <Check className="size-4" />
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Step counter below card */}
        <p className="text-text-tertiary mt-4 text-center text-xs">
          Step {step + 1} of {STEPS.length}
        </p>
      </div>
    </div>
  );
}
