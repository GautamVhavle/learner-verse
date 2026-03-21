/**
 * Hook for registering global keyboard shortcuts with modifier key support.
 */
import { useEffect } from "react";

interface Shortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description?: string;
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!event.key) return;

      const target = event.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      for (const shortcut of shortcuts) {
        const ctrlOrMeta = shortcut.ctrlKey || shortcut.metaKey;
        const matchesModifier = ctrlOrMeta
          ? event.ctrlKey || event.metaKey
          : true;
        const matchesShift = shortcut.shiftKey ? event.shiftKey : true;

        if (
          matchesModifier &&
          matchesShift &&
          event.key.toLowerCase() === shortcut.key.toLowerCase()
        ) {
          // Allow Ctrl/Cmd+key shortcuts even while typing
          // Block non-modifier shortcuts while typing
          if (isTyping && !ctrlOrMeta) {
            return;
          }
          event.preventDefault();
          shortcut.action();
          return;
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}
