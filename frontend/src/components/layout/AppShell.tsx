/**
 * Application shell providing sidebar, header, search palette, and keyboard shortcuts.
 */
import { useCallback, useState } from "react";
import { Outlet, useNavigate } from "react-router";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { CommandPalette } from "@/components/search/CommandPalette";
import { KeyboardShortcuts } from "@/components/shared/KeyboardShortcuts";
import { FontSizeSync } from "@/components/shared/FontSizeSync";
import { LiviChatPanel } from "@/components/chat/LiviChatPanel";
import OnboardingPage from "@/pages/OnboardingPage";
import { useMode } from "@/hooks/useMode";
import { useFocusMode } from "@/hooks/useFocusMode";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useUserQuery } from "@/hooks/useUser";
import { useChatStore } from "@/stores/chatStore";
import type { AppMode } from "@/stores/modeStore";

interface AppShellProps {
  mode: AppMode;
}

export function AppShell({ mode }: AppShellProps) {
  const navigate = useNavigate();
  const { setMode } = useMode();
  const { focusMode, setFocusMode } = useFocusMode();
  const [searchOpen, setSearchOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const { data: user, isLoading: userLoading } = useUserQuery();
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const { toggleChat } = useChatStore();

  const handleToggleMode = useCallback(() => {
    const newMode = mode === "creator" ? "student" : "creator";
    setMode(newMode);
    const newPath = newMode === "creator" ? "/creator" : "/learner";
    navigate(newPath, { replace: true });
  }, [mode, setMode, navigate]);

  const shortcuts = useCallback(
    () => [
      {
        key: "c",
        ctrlKey: true,
        shiftKey: true,
        action: handleToggleMode,
        description: "Toggle Creator/Learner mode",
      },
      {
        key: "k",
        ctrlKey: true,
        action: () => setSearchOpen(true),
        description: "Open search",
      },
      {
        key: "?",
        shiftKey: true,
        action: () => setShortcutsOpen(true),
        description: "Keyboard shortcuts",
      },
      {
        key: "l",
        ctrlKey: true,
        action: toggleChat,
        description: "Toggle LiVi chat",
      },
      {
        key: "Escape",
        action: () => {
          if (focusMode) setFocusMode(false);
        },
        description: "Exit focus mode / close modal",
      },
    ],
    [handleToggleMode, focusMode, setFocusMode, toggleChat],
  );

  useKeyboardShortcuts(shortcuts());

  // Show onboarding for first-time users
  if (!userLoading && user && !user.onboarding_complete && !onboardingDismissed) {
    return <OnboardingPage onComplete={() => setOnboardingDismissed(true)} />;
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        {/* Skip to content — accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent-blue focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
        >
          Skip to content
        </a>
        {/* Hide sidebar in focus mode — keep tree stable to avoid unmounting Outlet */}
        {!focusMode && <AppSidebar mode={mode} onToggleMode={handleToggleMode} />}
        <SidebarInset>
          {!focusMode && <Header onSearchClick={() => setSearchOpen(true)} />}
          <main id="main-content" className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-[1280px] px-4 py-4 sm:p-6">
              <Outlet />
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
      <KeyboardShortcuts open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <LiviChatPanel />
      <FontSizeSync />
    </TooltipProvider>
  );
}
