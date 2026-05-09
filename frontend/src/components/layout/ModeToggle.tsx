/**
 * Sidebar toggle button for switching between creator and learner modes.
 */
import { Pen, GraduationCap } from "lucide-react";
import { useMode } from "@/hooks/useMode";
import { usePlatform } from "@/hooks/usePlatform";
import { SidebarMenu, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ModeToggleProps {
  onToggle?: () => void;
}

export function ModeToggle({ onToggle }: ModeToggleProps) {
  const { mode } = useMode();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const isCreator = mode === "creator";
  const { isMobile, isMac } = usePlatform();

  const handleClick = () => {
    onToggle?.();
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        {isCollapsed ? (
          <Tooltip>
            <TooltipTrigger
              onClick={handleClick}
              className="hover:bg-sidebar-accent flex h-8 w-full cursor-pointer items-center justify-center rounded-md"
              data-testid="mode-toggle"
            >
              {isCreator ? (
                <Pen className="text-sidebar-foreground size-4" />
              ) : (
                <GraduationCap className="text-sidebar-foreground size-4" />
              )}
            </TooltipTrigger>
            <TooltipContent side="right">
              Switch to {isCreator ? "Learner" : "Creator"} mode
            </TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={handleClick}
            className="group border-sidebar-border bg-sidebar hover:bg-sidebar-accent flex w-full items-center gap-3 rounded-md border px-3 py-2 transition-colors"
            data-testid="mode-toggle"
          >
            {/* Pill toggle track — color based on current mode */}
            <div
              className={`relative flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${
                isCreator ? "bg-purple-200 dark:bg-purple-900" : "bg-blue-200 dark:bg-blue-900"
              }`}
            >
              <div
                className={`bg-primary flex size-5 items-center justify-center rounded-full shadow-sm transition-transform duration-200 ${
                  isCreator ? "translate-x-0" : "translate-x-5"
                }`}
              >
                {isCreator ? (
                  <Pen className="text-primary-foreground size-3" />
                ) : (
                  <GraduationCap className="text-primary-foreground size-3" />
                )}
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-sidebar-foreground text-xs leading-none font-medium">
                {isCreator ? "Creator" : "Learner"}
              </span>
              {!isMobile && (
                <span className="text-muted-foreground mt-0.5 text-[10px] leading-none">
                  {isMobile ? null : isMac ? "⌘⇧C to switch" : "Ctrl+Shift+C to switch"}
                </span>
              )}
            </div>
          </button>
        )}
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
