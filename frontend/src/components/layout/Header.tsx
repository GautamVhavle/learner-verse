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
  if (path.startsWith("/courses/") && path.endsWith("/edit"))
    return "Course Builder";
  if (path.startsWith("/courses/") && path.endsWith("/preview"))
    return "Preview";
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
      className="flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border bg-background px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
      data-testid="app-header"
    >
      <SidebarTrigger className="-ml-1" />
      <Separator
        orientation="vertical"
        className="mr-2 data-[orientation=vertical]:h-4"
      />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem className="hidden md:block">
            <span className="text-xs font-medium text-muted-foreground">
              {modeLabel}
            </span>
          </BreadcrumbItem>
          <BreadcrumbItem className="hidden md:block">
            <span className="text-muted-foreground">/</span>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Search trigger */}
      <button
        onClick={onSearchClick}
        className="ml-auto flex h-8 items-center gap-2 rounded-lg border border-border-default bg-bg-secondary px-3 text-sm text-text-tertiary transition-colors hover:border-border-hover hover:text-text-secondary sm:w-56"
        aria-label="Search"
        data-testid="search-trigger"
      >
        <Search className="size-3.5" />
        <span className="hidden flex-1 text-left sm:inline">Search...</span>
        <kbd className="hidden rounded border border-border-default bg-bg-tertiary px-1 py-px text-[10px] font-medium sm:inline-block">
          ⌘K
        </kbd>
      </button>

      {/* Ask LiVi */}
      <button
        onClick={toggleChat}
        className="flex h-8 items-center gap-2 rounded-lg border border-border-default bg-bg-secondary px-3 text-sm text-text-tertiary transition-colors hover:border-accent-purple/40 hover:text-accent-purple"
        aria-label="Ask LiVi"
      >
        <Sparkles className="size-3.5 text-accent-purple" />
        <span className="hidden sm:inline">Ask LiVi</span>
      </button>
    </header>
  );
}
