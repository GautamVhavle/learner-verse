/**
 * Badge component indicating a course's draft or ready status.
 */
import { Badge } from "@/components/ui/badge";

interface CourseStatusBadgeProps {
  status: "draft" | "ready";
}

export function CourseStatusBadge({ status }: CourseStatusBadgeProps) {
  return (
    <Badge
      variant={status === "ready" ? "default" : "secondary"}
      className={
        status === "ready"
          ? "bg-accent-green/15 text-accent-green"
          : "bg-bg-tertiary text-text-secondary"
      }
    >
      {status === "ready" ? "Ready" : "Draft"}
    </Badge>
  );
}
