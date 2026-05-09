import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router";

vi.mock("@/lib/auth", () => ({
  SINGLE_USER_MODE: true,
  SINGLE_USER: {
    id: "00000000-0000-0000-0000-000000000001",
    email: "local@learnerverse.dev",
    displayName: "Local User",
    avatarUrl: null,
  },
  CLERK_PUBLISHABLE_KEY: "",
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

let mockMode = "creator";

vi.mock("@/stores/modeStore", () => ({
  useModeStore: () => ({
    mode: mockMode,
    toggleMode: vi.fn(),
    setMode: vi.fn(),
  }),
}));

vi.mock("@/hooks/useCourses", () => ({
  useCoursesQuery: () => ({
    data: { items: [], total: 0 },
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useEnrollments", () => ({
  useEnrolledCoursesQuery: () => ({
    data: { items: [], total: 0 },
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useNotifications", () => ({
  useUnreadCountQuery: () => ({
    data: { count: 0 },
  }),
}));

vi.mock("@/hooks/useUser", () => ({
  useUserQuery: () => ({
    data: {
      id: "00000000-0000-0000-0000-000000000001",
      email: "local@learnerverse.dev",
      display_name: "Local User",
      avatar_url: null,
    },
    isLoading: false,
  }),
}));

// Need to mock the sidebar context for child components
vi.mock("@/components/ui/sidebar", async () => {
  const actual =
    await vi.importActual<Record<string, unknown>>(
      "@/components/ui/sidebar",
    );
  return {
    ...actual,
    useSidebar: () => ({
      state: "expanded",
      open: true,
      setOpen: vi.fn(),
      openMobile: false,
      setOpenMobile: vi.fn(),
      isMobile: false,
      toggleSidebar: vi.fn(),
    }),
    SidebarProvider: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    SidebarInset: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    Sidebar: ({ children }: { children: React.ReactNode }) => (
      <nav data-testid="sidebar">{children}</nav>
    ),
    SidebarContent: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    SidebarHeader: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    SidebarFooter: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    SidebarGroup: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    SidebarGroupLabel: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    SidebarMenu: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    SidebarMenuItem: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    SidebarMenuButton: ({
      children,
      ...rest
    }: {
      children: React.ReactNode;
      [key: string]: unknown;
    }) => <button {...rest}>{children}</button>,
    SidebarMenuSub: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    SidebarMenuSubItem: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    SidebarMenuSubButton: ({
      children,
      ...rest
    }: {
      children: React.ReactNode;
      [key: string]: unknown;
    }) => <button {...rest}>{children}</button>,
    SidebarRail: () => null,
    SidebarSeparator: () => <hr />,
    SidebarTrigger: () => <button data-testid="sidebar-trigger">Toggle</button>,
  };
});

vi.mock("@/components/ui/collapsible", () => ({
  Collapsible: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CollapsibleTrigger: ({
    children,
  }: {
    children: React.ReactNode;
    render?: React.ReactNode;
  }) => <div>{children}</div>,
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Tooltip: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  TooltipTrigger: ({ children, ...props }: Record<string, unknown>) => (
    <button {...props}>{children as React.ReactNode}</button>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

import { AppSidebar } from "@/components/layout/Sidebar";

describe("Sidebar", () => {
  it("renders navigation items for creator mode", () => {
    mockMode = "creator";
    render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>,
    );
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("My Courses")).toBeInTheDocument();
    expect(screen.getByText("Analytics")).toBeInTheDocument();
    expect(screen.getByText("Trash")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("shows learner navigation in learner mode", () => {
    mockMode = "student";
    render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>,
    );
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Library")).toBeInTheDocument();
    expect(screen.getByText("Course Hub")).toBeInTheDocument();
    expect(screen.getByText("Goals")).toBeInTheDocument();
    expect(screen.getByText("Certificates")).toBeInTheDocument();
    expect(screen.getByText("Inbox")).toBeInTheDocument();
    expect(screen.queryByText("Trash")).not.toBeInTheDocument();
  });

  it("renders brand header with mode label", () => {
    mockMode = "creator";
    render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>,
    );
    expect(screen.getByText("Learner Verse")).toBeInTheDocument();
    expect(screen.getByText("Creator Mode")).toBeInTheDocument();
  });

  it("renders user info in footer", () => {
    render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>,
    );
    expect(screen.getByText("Local User")).toBeInTheDocument();
    expect(
      screen.getByText("local@learnerverse.dev"),
    ).toBeInTheDocument();
  });
});
