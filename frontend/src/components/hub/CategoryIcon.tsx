/**
 * Maps category icon names to Lucide icon components.
 */
import {
  Monitor,
  Briefcase,
  FlaskConical,
  Wrench,
  Calculator,
  Palette,
  Heart,
  GraduationCap,
  BookOpen,
  Users,
  Globe,
  Scale,
  TrendingUp,
  Sparkles,
  Coffee,
  ClipboardCheck,
  MoreHorizontal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Monitor,
  Briefcase,
  FlaskConical,
  Wrench,
  Calculator,
  Palette,
  Heart,
  GraduationCap,
  BookOpen,
  Users,
  Globe,
  Scale,
  TrendingUp,
  Sparkles,
  Coffee,
  ClipboardCheck,
  MoreHorizontal,
};

interface CategoryIconProps {
  icon: string;
  className?: string;
}

export function CategoryIcon({ icon, className = "size-4" }: CategoryIconProps) {
  const Icon = ICON_MAP[icon] ?? MoreHorizontal;
  return <Icon className={className} />;
}
