/**
 * Sidebar toggle button for switching between creator and learner modes.
 * Segmented-control design that stands out from regular nav items.
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

  const targetMode = isCreator ? "Learner" : "Creator";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        {isCollapsed ? (
          <Tooltip>
            <TooltipTrigger
              onClick={handleClick}
              className={`flex h-8 w-full cursor-pointer items-center justify-center rounded-lg transition-colors ${
                isCreator
                  ? "bg-purple-500/15 text-purple-500 hover:bg-purple-500/25"
                  : "bg-blue-500/15 text-blue-500 hover:bg-blue-500/25"
              }`}
              data-testid="mode-toggle"
            >
              {isCreator ? <Pen className="size-4" /> : <GraduationCap className="size-4" />}
            </TooltipTrigger>
            <TooltipContent side="right">Switch to {targetMode} mode</TooltipContent>
          </Tooltip>
        ) : (
          <div className="flex flex-col gap-1.5">
            {/* Segmented control */}
            <div
              className="bg-sidebar-accent/50 relative flex w-full rounded-lg p-1"
              data-testid="mode-toggle"
            >
              {/* Sliding background */}
              <div
                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-md shadow-sm transition-all duration-200 ${
                  isCreator ? "left-1 bg-purple-500" : "left-[calc(50%+2px)] bg-blue-500"
                }`}
              />

              {/* Creator button */}
              <button
                onClick={isCreator ? undefined : handleClick}
                className={`relative z-10 flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition-colors ${
                  isCreator ? "text-white" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Pen className="size-3" />
                Creator
              </button>

              {/* Learner button */}
              <button
                onClick={isCreator ? handleClick : undefined}
                className={`relative z-10 flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition-colors ${
                  !isCreator ? "text-white" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <GraduationCap className="size-3.5" />
                Learner
              </button>
            </div>

            {/* Shortcut hint */}
            {!isMobile && (
              <p className="text-muted-foreground text-center text-[10px]">
                {isMac ? "⌘⇧C" : "Ctrl+Shift+C"} to switch
              </p>
            )}
          </div>
        )}
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
