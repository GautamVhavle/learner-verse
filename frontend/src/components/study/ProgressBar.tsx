/**
 * Horizontal progress bar with optional percentage label.
 */
interface ProgressBarProps {
  value: number; // 0-100
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}

export function ProgressBar({
  value,
  size = "sm",
  showLabel = false,
  className = "",
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const h = size === "sm" ? "h-1.5" : "h-2.5";

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`${h} bg-bg-tertiary flex-1 overflow-hidden rounded-full`}>
        <div
          className={`${h} rounded-full transition-all duration-500 ease-out ${
            clamped === 100 ? "bg-accent-green" : "bg-accent-blue"
          }`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-text-tertiary shrink-0 text-xs tabular-nums">
          {Math.round(clamped)}%
        </span>
      )}
    </div>
  );
}
