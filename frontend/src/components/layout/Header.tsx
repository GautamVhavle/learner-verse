/**
 * Top header bar with breadcrumb navigation and search trigger.
 */
import { useLocation } from "react-router";
import { Search, Sparkles } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { useMode } from "@/hooks/useMode";
import { useChatStore } from "@/stores/chatStore";
import { PomodoroTimer } from "@/components/layout/PomodoroTimer";

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/courses": "Courses",
  "/inbox": "Inbox",
  "/trash": "Trash",
  "/settings": "Settings",
  "/goals": "Goals",
  "/stats": "Stats",
  "/certificates": "Certificates",
};

function getPageTitle(pathname: string): string {
  // Strip mode prefix for matching
  const path = pathname.replace(/^\/(creator|learner)/, "");
  if (PAGE_TITLES[path]) return PAGE_TITLES[path];
  if (path === "" || path === "/") return PAGE_TITLES["/"];
  if (path.startsWith("/courses/") && path.endsWith("/edit")) return "Course Builder";
  if (path.startsWith("/courses/") && path.endsWith("/preview")) return "Preview";
  if (path.match(/^\/study\/[^/]+\/lessons\//)) return "Studying";
  if (path.startsWith("/study/")) return "Study";
  return "Dashboard";
}

interface HeaderProps {
  onSearchClick?: () => void;
}

export function Header({ onSearchClick }: HeaderProps) {
  const location = useLocation();
  const { mode } = useMode();
  const { toggleChat } = useChatStore();

  const pageTitle = getPageTitle(location.pathname);
  const modeLabel = mode === "creator" ? "Creator" : "Learner";

  return (
    <header
      className="border-sidebar-border bg-background sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
      data-testid="app-header"
    >
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem className="hidden md:block">
            <span className="text-muted-foreground text-xs font-medium">{modeLabel}</span>
          </BreadcrumbItem>
          <BreadcrumbItem className="hidden md:block">
            <span className="text-muted-foreground">/</span>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Focus timer — hidden on very small screens */}
      <div className="ml-auto hidden sm:block">
        <PomodoroTimer />
      </div>

      {/* Search trigger */}
      <button
        onClick={onSearchClick}
        className="border-border-default bg-bg-secondary text-text-tertiary hover:border-border-hover hover:text-text-secondary ml-auto flex h-8 items-center gap-2 rounded-lg border px-3 text-sm transition-colors sm:ml-0 sm:w-56"
        aria-label="Search"
        data-testid="search-trigger"
      >
        <Search className="size-3.5" />
        <span className="hidden flex-1 text-left sm:inline">Search...</span>
        <kbd className="border-border-default bg-bg-tertiary hidden rounded border px-1 py-px text-[10px] font-medium sm:inline-block">
          ⌘K
        </kbd>
      </button>

      {/* Ask LiVi */}
      <button
        onClick={toggleChat}
        className="border-border-default bg-bg-secondary text-text-tertiary hover:border-accent-purple/40 hover:text-accent-purple flex h-8 items-center gap-2 rounded-lg border px-3 text-sm transition-colors"
        aria-label="Ask LiVi"
      >
        <Sparkles className="text-accent-purple size-3.5" />
        <span className="hidden sm:inline">Ask LiVi</span>
      </button>
    </header>
  );
}
