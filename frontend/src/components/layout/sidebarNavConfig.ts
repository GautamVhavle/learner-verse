/**
 * Sidebar navigation configuration.
 *
 * Centralises all navigation link definitions for both Creator
 * and Learner modes, plus secondary (settings/help) links.
 * Each link specifies a Lucide icon, route path, and optional
 * "coming soon" flag.
 */
import {
  Award,
  BarChart3,
  Globe,
  HelpCircle,
  Inbox,
  LayoutDashboard,
  LineChart,
  Settings,
  Target,
  Trash2,
  type LucideIcon,
} from "lucide-react";

export interface NavLink {
  title: string;
  icon: LucideIcon;
  path: string;
  comingSoon?: boolean;
}

/** Primary navigation links for Creator mode. */
export const CREATOR_LINKS: NavLink[] = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/" },
  { title: "Course Hub", icon: Globe, path: "/hub" },
  { title: "Analytics", icon: LineChart, path: "/analytics" },
  { title: "Trash", icon: Trash2, path: "/trash" },
];

/** Extra navigation links for Creator mode (currently empty). */
export const CREATOR_EXTRA: NavLink[] = [];

/** Primary navigation links for Learner mode. */
export const LEARNER_LINKS: NavLink[] = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/" },
  { title: "Course Hub", icon: Globe, path: "/hub" },
  { title: "Inbox", icon: Inbox, path: "/inbox" },
  { title: "Goals", icon: Target, path: "/goals" },
  { title: "Stats", icon: BarChart3, path: "/stats" },
  { title: "Certificates", icon: Award, path: "/certificates" },
];

/** Extra "coming soon" navigation links for Learner mode. */
export const LEARNER_EXTRA: NavLink[] = [];

/** Bottom secondary navigation (settings, help). */
export const SECONDARY_LINKS: NavLink[] = [
  { title: "Settings", icon: Settings, path: "/settings" },
  { title: "Help", icon: HelpCircle, path: "/help" },
];
