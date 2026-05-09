/**
 * Compact indicator showing completed-vs-total lesson count for a section.
 */
interface SectionProgressProps {
  completed: number;
  total: number;
}

export function SectionProgress({ completed, total }: SectionProgressProps) {
  if (total === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`size-1.5 rounded-full transition-colors ${
              i < completed ? "bg-accent-green" : "bg-bg-tertiary"
            }`}
          />
        ))}
      </div>
      <span className="text-text-tertiary text-xs tabular-nums">
        {completed}/{total}
      </span>
    </div>
  );
}
