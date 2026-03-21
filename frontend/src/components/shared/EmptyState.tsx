/**
 * Placeholder component shown when a list or view has no content.
 */
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Optional secondary (outline) action */
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Compact mode (no min‑height) for inline usage */
  compact?: boolean;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={`flex items-center justify-center rounded-xl border border-dashed border-border-default ${
        compact ? "py-12" : "min-h-[40vh] py-16"
      }`}
      data-testid="empty-state"
    >
      <div className="flex max-w-sm flex-col items-center text-center">
        {icon && <div className="mb-4 text-text-tertiary">{icon}</div>}
        <h3 className="text-base font-medium text-text-primary">{title}</h3>
        <p className="mt-1 text-sm text-text-secondary">{description}</p>
        {(actionLabel || secondaryLabel) && (
          <div className="mt-5 flex gap-2">
            {secondaryLabel && onSecondary && (
              <Button variant="outline" size="sm" onClick={onSecondary}>
                {secondaryLabel}
              </Button>
            )}
            {actionLabel && onAction && (
              <Button size="sm" onClick={onAction}>
                {actionLabel}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
