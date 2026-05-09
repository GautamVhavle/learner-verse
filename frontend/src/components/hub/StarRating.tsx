/**
 * Reusable star rating component — supports read-only display and interactive input.
 */
import { Star } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md" | "lg";
  readOnly?: boolean;
  className?: string;
}

const SIZES = { sm: "size-3.5", md: "size-4", lg: "size-5" };

export function StarRating({
  value,
  onChange,
  size = "md",
  readOnly = false,
  className,
}: StarRatingProps) {
  const [hover, setHover] = useState(0);
  const iconSize = SIZES[size];

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = readOnly ? star <= Math.round(value) : star <= (hover || value);
        return (
          <button
            key={star}
            type="button"
            disabled={readOnly}
            onClick={() => onChange?.(star)}
            onMouseEnter={() => !readOnly && setHover(star)}
            onMouseLeave={() => !readOnly && setHover(0)}
            className={cn(
              "transition-colors",
              readOnly ? "cursor-default" : "cursor-pointer",
              filled ? "text-amber-400" : "text-text-tertiary",
            )}
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
          >
            <Star className={cn(iconSize, filled && "fill-current")} />
          </button>
        );
      })}
    </div>
  );
}
