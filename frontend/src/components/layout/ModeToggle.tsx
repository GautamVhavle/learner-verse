/**
 * Sidebar toggle button for switching between creator and learner modes.
 */
import { Pen, GraduationCap } from "lucide-react";
import { useMode } from "@/hooks/useMode";
import {
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ModeToggleProps {
  onToggle?: () => void;
}

export function ModeToggle({ onToggle }: ModeToggleProps) {
  const { mode } = useMode();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const isCreator = mode === "creator";

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
              className="flex h-8 w-full items-center justify-center rounded-md hover:bg-sidebar-accent cursor-pointer"
              data-testid="mode-toggle"
            >
                {isCreator ? (
                  <Pen className="size-4 text-sidebar-foreground" />
                ) : (
                  <GraduationCap className="size-4 text-sidebar-foreground" />
                )}
            </TooltipTrigger>
            <TooltipContent side="right">
              Switch to {isCreator ? "Learner" : "Creator"} mode
            </TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={handleClick}
            className="group flex w-full items-center gap-3 rounded-md border border-sidebar-border bg-sidebar px-3 py-2 transition-colors hover:bg-sidebar-accent"
            data-testid="mode-toggle"
          >
            {/* Pill toggle track — color based on current mode */}
            <div className={`relative flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${
              isCreator ? "bg-purple-200 dark:bg-purple-900" : "bg-blue-200 dark:bg-blue-900"
            }`}>
              <div
                className={`flex size-5 items-center justify-center rounded-full bg-primary shadow-sm transition-transform duration-200 ${
                  isCreator ? "translate-x-0" : "translate-x-5"
                }`}
              >
                {isCreator ? (
                  <Pen className="size-3 text-primary-foreground" />
                ) : (
                  <GraduationCap className="size-3 text-primary-foreground" />
                )}
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium leading-none text-sidebar-foreground">
                {isCreator ? "Creator" : "Learner"}
              </span>
              <span className="mt-0.5 text-[10px] leading-none text-muted-foreground">
                ⌘⇧C to switch
              </span>
            </div>
          </button>
        )}
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
