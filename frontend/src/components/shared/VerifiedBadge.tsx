/**
 * VerifiedBadge - shows a blue checkmark badge for verified creators.
 *
 * Used on: public profiles, course cards, creator header, hub pages.
 */
import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface VerifiedBadgeProps {
  className?: string;
  /** Size in pixels - controls icon dimensions */
  size?: number;
  /** If true, shows "Verified Creator" text alongside the icon */
  showLabel?: boolean;
}

export function VerifiedBadge({ className, size = 16, showLabel = false }: VerifiedBadgeProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 text-blue-500", className)}
      title="Verified Creator"
      aria-label="Verified Creator"
    >
      <BadgeCheck size={size} />
      {showLabel && <span className="text-xs font-medium text-blue-500">Verified Creator</span>}
    </span>
  );
}
