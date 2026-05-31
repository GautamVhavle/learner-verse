/**
 * App sidebar - main navigation panel.
 *
 * Renders role-aware navigation (Creator vs Learner), a collapsible
 * courses sub-menu, a mode toggle, and the user footer. Navigation
 * links are defined in `sidebarNavConfig.ts`.
 */
import { useLocation, useNavigate } from "react-router";
import { useState } from "react";
import { BookOpen, ChevronRight, Crown, Pen, Sparkles } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/layout/ModeToggle";
import { NavUser } from "@/components/layout/NavUser";
import { useAuth } from "@/hooks/useAuth";
import { useUserQuery } from "@/hooks/useUser";
import { useMode } from "@/hooks/useMode";
import { useCoursesQuery } from "@/hooks/useCourses";
import { useEnrolledCoursesQuery } from "@/hooks/useEnrollments";
import { NotificationBadge } from "@/components/notification/NotificationBadge";
import { useChatStore } from "@/stores/chatStore";
import { UpgradeBanner } from "@/components/layout/UpgradeBanner";
import { AboutDialog } from "@/components/layout/AboutDialog";
import {
  CREATOR_LINKS,
  CREATOR_EXTRA,
  LEARNER_LINKS,
  LEARNER_EXTRA,
  SECONDARY_LINKS,
  ABOUT_LINK,
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
  const { user: authUser } = useAuth();
  const { data: profile } = useUserQuery();
  const { isCreator } = useMode();
  const { toggleChat } = useChatStore();
  const { isMobile, setOpenMobile } = useSidebar();
  const [aboutOpen, setAboutOpen] = useState(false);

  /** Navigate and close sidebar on mobile */
  const navTo = (path: string) => {
    navigate(path);
    if (isMobile) setOpenMobile(false);
  };

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
          onClick={() => !item.comingSoon && navTo(fullPath)}
          className={item.comingSoon ? "cursor-default opacity-50" : "cursor-pointer"}
        >
          <item.icon />
          <span>{item.title}</span>
          {item.comingSoon && (
            <span className="bg-bg-tertiary text-text-tertiary ml-auto rounded-sm px-1.5 py-0.5 text-[9px] font-medium">
              Soon
            </span>
          )}
          {item.path === "/inbox" && !item.comingSoon && <NotificationBadge />}
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
            <SidebarMenuButton size="lg" className="pointer-events-none">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg">
                <img src="/logo.svg" alt="Learner Verse Logo" className="h-6 w-6" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="flex items-center gap-1.5 overflow-visible font-semibold">
                  <span className="truncate">Learner Verse</span>
                  {profile?.is_pro && (
                    <span className="from-accent-purple/20 inline-flex items-center gap-1 rounded-full bg-gradient-to-r to-amber-500/20 px-2 py-0.5 text-[9px] font-bold tracking-wider text-amber-500 uppercase ring-1 ring-amber-500/30">
                      <Crown className="size-2.5 fill-amber-500/40" />
                      Pro
                    </span>
                  )}
                </span>
                <span className="text-muted-foreground truncate text-xs">
                  Learn. Create. Grow.
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Mode Toggle - prominent placement */}
        <SidebarGroup className="px-2 pt-1 pb-0">
          <ModeToggle onToggle={onToggleMode} />
        </SidebarGroup>

        {/* Primary navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>{isCreator ? "Creator" : "Learner"}</SidebarGroupLabel>
          <SidebarMenu>
            {primaryLinks.map(renderNavItem)}

            {/* Collapsible Courses group */}
            <Collapsible className="group/collapsible">
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
                    {/* View All link - Creator only */}
                    {isCreator && (
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          size="sm"
                          isActive={location.pathname === `${modePrefix}/courses`}
                          onClick={() => navTo(`${modePrefix}/courses`)}
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
                          isActive={
                            location.pathname === course.path ||
                            location.pathname.startsWith(course.path + "/")
                          }
                          onClick={() => navTo(course.path)}
                          className="cursor-pointer"
                        >
                          <span className="truncate">{course.title}</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}

                    {courseSubItems.length === 0 && (
                      <SidebarMenuSubItem>
                        <span className="text-muted-foreground px-2 py-1 text-xs">
                          {isCreator ? "No courses yet" : "No enrolled courses"}
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
            <SidebarMenu>{extraLinks.map(renderNavItem)}</SidebarMenu>
          </SidebarGroup>
        )}

        <SidebarSeparator />

        {/* Upgrade / Pro Status Banner */}
        <UpgradeBanner />
      </SidebarContent>

      {/* Footer: LiVi, Settings, Help, About, User */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Ask LiVi"
              onClick={() => { toggleChat(); if (isMobile) setOpenMobile(false); }}
              className="cursor-pointer"
              size="sm"
            >
              <Sparkles className="text-accent-purple" />
              <span>LiVi</span>
              <span className="bg-accent-purple/10 text-accent-purple ml-auto rounded-sm px-1.5 py-0.5 text-[9px] font-medium">
                AI
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {SECONDARY_LINKS.map((item) => {
            const fullPath = `${modePrefix}${item.path}`;
            return (
              <SidebarMenuItem key={fullPath}>
                <SidebarMenuButton
                  tooltip={item.comingSoon ? `${item.title} (Coming Soon)` : item.title}
                  isActive={!item.comingSoon && location.pathname === fullPath}
                  onClick={() => !item.comingSoon && navTo(fullPath)}
                  className={item.comingSoon ? "cursor-default opacity-50" : "cursor-pointer"}
                  size="sm"
                >
                  <item.icon />
                  <span>{item.title}</span>
                  {item.comingSoon && (
                    <span className="bg-bg-tertiary text-text-tertiary ml-auto rounded-sm px-1.5 py-0.5 text-[9px] font-medium">
                      Soon
                    </span>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="About"
              onClick={() => setAboutOpen(true)}
              className="cursor-pointer"
              size="sm"
            >
              <ABOUT_LINK.icon />
              <span>{ABOUT_LINK.title}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <NavUser
          name={profile?.display_name ?? authUser?.displayName ?? "User"}
          email={profile?.email ?? authUser?.email ?? ""}
          avatar={profile?.avatar_url ?? authUser?.avatarUrl ?? undefined}
        />
      </SidebarFooter>

      <SidebarRail />
      <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
    </Sidebar>
  );
}
