/**
 * Sidebar user menu with avatar, settings, and sign-out actions.
 */
import { LogOut, Settings, User } from "lucide-react";
import { useAuth0 } from "@auth0/auth0-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { ChevronsUpDown } from "lucide-react";
import { useModeAwareNavigate } from "@/hooks/useModeAwareNavigate";
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
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const auth0 = SINGLE_USER_MODE ? null : useAuth0();

  const handleSignOut = () => {
    auth0?.logout({ logoutParams: { returnTo: window.location.origin } });
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex w-full min-w-0 items-center gap-2 overflow-hidden rounded-md p-2 text-left hover:bg-sidebar-accent"
            data-testid="user-menu-trigger"
          >
              <Avatar className="h-8 w-8 rounded-lg">
                {avatar && <AvatarImage src={avatar} alt={name} />}
                <AvatarFallback className="rounded-lg">
                  {getInitials(name)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {email}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    {avatar && <AvatarImage src={avatar} alt={name} />}
                    <AvatarFallback className="rounded-lg">
                      {getInitials(name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {email}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <User />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <Settings />
                Settings
              </DropdownMenuItem>
            </DropdownMenuGroup>
            {!SINGLE_USER_MODE && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
