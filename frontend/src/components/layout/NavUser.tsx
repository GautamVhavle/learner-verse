/**
 * Sidebar user footer - click avatar/name to open profile,
 * click the chevron arrow for sign-out dropdown.
 */
import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { ChevronsUpDown } from "lucide-react";
import { useModeAwareNavigate } from "@/hooks/useModeAwareNavigate";
import { useUserQuery } from "@/hooks/useUser";
import { useMaybeAuth0 } from "@/hooks/useMaybeAuth0";
import { SINGLE_USER_MODE } from "@/lib/auth";

interface NavUserProps {
  name: string;
  email: string;
  avatar?: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function NavUser({ name, email, avatar }: NavUserProps) {
  const { isMobile } = useSidebar();
  const navigate = useModeAwareNavigate();
  const { data: profile } = useUserQuery();
  const auth0 = useMaybeAuth0();

  const handleSignOut = () => {
    auth0?.logout({ logoutParams: { returnTo: window.location.origin } });
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="flex w-full min-w-0 items-center gap-2 rounded-md p-2">
          {/* Clicking avatar / name → opens profile settings */}
          <button
            onClick={() => navigate("/profile")}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-md text-left transition-colors hover:opacity-80"
            data-testid="user-profile-trigger"
          >
            <Avatar className="h-8 w-8 shrink-0 rounded-lg">
              {avatar && <AvatarImage src={avatar} alt={name} />}
              <AvatarFallback className="rounded-lg">{getInitials(name)}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="flex items-center gap-1.5 truncate font-medium">
                {name}
                {profile?.is_pro && (
                  <span className="bg-accent-purple/10 text-accent-purple rounded-sm px-1.5 py-0.5 text-[9px] font-semibold">
                    PRO
                  </span>
                )}
              </span>
              <span className="text-muted-foreground truncate text-xs">{email}</span>
            </div>
          </button>

          {/* Arrow → sign-out dropdown */}
          {!SINGLE_USER_MODE && (
            <DropdownMenu>
              <DropdownMenuTrigger
                className="text-muted-foreground hover:bg-sidebar-accent hover:text-foreground flex shrink-0 items-center justify-center rounded-md p-1 transition-colors"
                data-testid="user-menu-trigger"
              >
                <ChevronsUpDown className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="min-w-40 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
