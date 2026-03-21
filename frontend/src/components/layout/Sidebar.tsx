/**
 * App sidebar — main navigation panel.
 *
 * Renders role-aware navigation (Creator vs Learner), a collapsible
 * courses sub-menu, a mode toggle, and the user footer. Navigation
 * links are defined in `sidebarNavConfig.ts`.
 */
import { useLocation, useNavigate } from "react-router";
import {
  BookOpen,
  ChevronRight,
  GraduationCap,
  Pen,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/layout/ModeToggle";
import { NavUser } from "@/components/layout/NavUser";
import { useAuth } from "@/hooks/useAuth";
import { useMode } from "@/hooks/useMode";
import { useCoursesQuery } from "@/hooks/useCourses";
import { useEnrolledCoursesQuery } from "@/hooks/useEnrollments";
import {
  CREATOR_LINKS,
  CREATOR_EXTRA,
  LEARNER_LINKS,
  LEARNER_EXTRA,
  SECONDARY_LINKS,
  type NavLink,
} from "./sidebarNavConfig";

export function AppSidebar({
  mode,
  onToggleMode,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  mode: "creator" | "student";
  onToggleMode: () => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isCreator } = useMode();

  // Fetch courses for the sidebar list
  const { data: allCourses } = useCoursesQuery();
  const { data: enrolledCoursesData } = useEnrolledCoursesQuery();

  const primaryLinks = isCreator ? CREATOR_LINKS : LEARNER_LINKS;
  const extraLinks = isCreator ? CREATOR_EXTRA : LEARNER_EXTRA;

  // Build the collapsible "Courses" group with sub-items
  const modePrefix = mode === "creator" ? "/creator" : "/learner";
  const courseSubItems = isCreator
    ? (allCourses?.items ?? []).slice(0, 8).map((c) => ({
        title: c.title,
        path: `${modePrefix}/courses/${c.id}/edit`,
      }))
    : (enrolledCoursesData?.items ?? []).slice(0, 8).map((c) => ({
        title: c.title,
        path: `${modePrefix}/study/${c.id}`,
      }));

  const renderNavItem = (item: NavLink) => {
    const fullPath = `${modePrefix}${item.path}`;
    return (
      <SidebarMenuItem key={fullPath}>
        <SidebarMenuButton
          tooltip={item.comingSoon ? `${item.title} (Coming Soon)` : item.title}
          isActive={!item.comingSoon && location.pathname === fullPath}
          onClick={() => !item.comingSoon && navigate(fullPath)}
          className={item.comingSoon ? "cursor-default opacity-50" : "cursor-pointer"}
        >
          <item.icon />
          <span>{item.title}</span>
          {item.comingSoon && (
            <span className="ml-auto rounded-sm bg-bg-tertiary px-1.5 py-0.5 text-[9px] font-medium text-text-tertiary">
              Soon
            </span>
          )}
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      {/* Brand */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="pointer-events-none"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <GraduationCap className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Learner Verse</span>
                <span className="truncate text-xs text-muted-foreground">
                  {isCreator ? "Creator Mode" : "Learner Mode"}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Primary navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>
            {isCreator ? "Creator" : "Learner"}
          </SidebarGroupLabel>
          <SidebarMenu>
            {primaryLinks.map(renderNavItem)}

            {/* Collapsible Courses group */}
            <Collapsible defaultOpen className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger
                  render={
                    <SidebarMenuButton
                      tooltip={isCreator ? "My Courses" : "Library"}
                      className="cursor-pointer"
                      isActive={
                        location.pathname === `${modePrefix}/courses` ||
                        location.pathname.startsWith(`${modePrefix}/courses/`) ||
                        location.pathname.startsWith(`${modePrefix}/study/`)
                      }
                    />
                  }
                >
                  {isCreator ? <Pen className="size-4" /> : <BookOpen className="size-4" />}
                  <span>{isCreator ? "My Courses" : "Library"}</span>
                  <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[open]/collapsible:rotate-90" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {/* View All link — Creator only */}
                    {isCreator && (
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          size="sm"
                          isActive={location.pathname === `${modePrefix}/courses`}
                          onClick={() => navigate(`${modePrefix}/courses`)}
                          className="cursor-pointer"
                        >
                          <span>View All</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    )}

                    {/* Individual courses */}
                    {courseSubItems.map((course) => (
                      <SidebarMenuSubItem key={course.path}>
                        <SidebarMenuSubButton
                          size="sm"
                          isActive={location.pathname === course.path || location.pathname.startsWith(course.path + "/")}
                          onClick={() => navigate(course.path)}
                          className="cursor-pointer"
                        >
                          <span className="truncate">{course.title}</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}

                    {courseSubItems.length === 0 && (
                      <SidebarMenuSubItem>
                        <span className="px-2 py-1 text-xs text-muted-foreground">
                          {isCreator
                            ? "No courses yet"
                            : "No enrolled courses"}
                        </span>
                      </SidebarMenuSubItem>
                    )}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          </SidebarMenu>
        </SidebarGroup>

        {/* Extra / Coming Soon features */}
        {extraLinks.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>More</SidebarGroupLabel>
            <SidebarMenu>
              {extraLinks.map(renderNavItem)}
            </SidebarMenu>
          </SidebarGroup>
        )}

        {/* Mode Toggle */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel>Mode</SidebarGroupLabel>
          <ModeToggle onToggle={onToggleMode} />
        </SidebarGroup>

        <SidebarSeparator />

        {/* Secondary navigation (settings, etc.) */}
        <SidebarGroup>
          <SidebarMenu>
            {SECONDARY_LINKS.map((item) => {
              const fullPath = `${modePrefix}${item.path}`;
              return (
                <SidebarMenuItem key={fullPath}>
                  <SidebarMenuButton
                    tooltip={item.comingSoon ? `${item.title} (Coming Soon)` : item.title}
                    isActive={!item.comingSoon && location.pathname === fullPath}
                    onClick={() => !item.comingSoon && navigate(fullPath)}
                    className={item.comingSoon ? "cursor-default opacity-50" : "cursor-pointer"}
                    size="sm"
                  >
                    <item.icon />
                    <span>{item.title}</span>
                    {item.comingSoon && (
                      <span className="ml-auto rounded-sm bg-bg-tertiary px-1.5 py-0.5 text-[9px] font-medium text-text-tertiary">
                        Soon
                      </span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      {/* User Footer */}
      <SidebarFooter>
        <NavUser
          name={user?.displayName ?? "User"}
          email={user?.email ?? ""}
          avatar={user?.avatarUrl ?? undefined}
        />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
