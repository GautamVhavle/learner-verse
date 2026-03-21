/**
 * Confetti celebration modal shown when a course is completed.
 */
import { useEffect, useRef, useCallback } from "react";
import confetti from "canvas-confetti";
import { Award, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface CelebrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseTitle: string;
  onViewCertificate: () => void;
  goalMetEarlyByDays?: number | null;
}

export function CelebrationModal({
  open,
  onOpenChange,
  courseTitle,
  onViewCertificate,
  goalMetEarlyByDays,
}: CelebrationModalProps) {
  const firedRef = useRef(false);

  const fireConfetti = useCallback(() => {
    // Respect prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) return;

    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ["#a855f7", "#3b82f6", "#22c55e", "#f59e0b"],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ["#a855f7", "#3b82f6", "#22c55e", "#f59e0b"],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }, []);

  useEffect(() => {
    if (open && !firedRef.current) {
      firedRef.current = true;
      // Small delay to let the modal animate in
      const timer = setTimeout(fireConfetti, 200);
      return () => clearTimeout(timer);
    }
    if (!open) {
      firedRef.current = false;
    }
  }, [open, fireConfetti]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        showCloseButton={false}
      >
        <div className="flex flex-col items-center gap-5 py-4 text-center">
          {/* Trophy / Award icon */}
          <div className="flex size-20 items-center justify-center rounded-full bg-accent-purple/15 ring-2 ring-accent-purple/25">
            <Award className="size-10 text-accent-purple" />
          </div>

          <DialogHeader className="items-center">
            <DialogTitle className="text-xl">
              Congratulations!
            </DialogTitle>
            <DialogDescription className="text-sm text-text-secondary">
              You&apos;ve completed{" "}
              <span className="font-medium text-text-primary">
                {courseTitle}
              </span>
            </DialogDescription>
          </DialogHeader>

          <p className="text-xs text-text-tertiary">
            Your dedication paid off. You&apos;ve earned a certificate of
            completion.
          </p>

          {goalMetEarlyByDays != null && goalMetEarlyByDays > 0 && (
            <div className="rounded-lg border border-accent-green/20 bg-accent-green/10 px-4 py-2">
              <p className="text-sm font-medium text-accent-green">
                🎯 Goal met! You finished {goalMetEarlyByDays} day
                {goalMetEarlyByDays === 1 ? "" : "s"} early!
              </p>
            </div>
          )}

          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
            <Button
              onClick={onViewCertificate}
              className="gap-2"
            >
              <Award className="size-4" />
              View Certificate
              <ArrowRight className="size-3.5" />
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
