/**
 * Dialog displaying the available keyboard shortcuts.
 * Platform-aware: shows ⌘ on Mac, Ctrl on Windows, hidden on mobile.
 */
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { usePlatform } from "@/hooks/usePlatform";

interface ShortcutEntry {
  /** Each element is a key name; "Ctrl" and "Shift" are resolved at render time. */
  keys: string[];
  description: string;
}

interface ShortcutGroup {
  title: string;
  shortcuts: ShortcutEntry[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "Global",
    shortcuts: [
      { keys: ["Ctrl", "K"], description: "Open search" },
      { keys: ["Ctrl", "Shift", "C"], description: "Toggle Creator / Learner mode" },
      { keys: ["?"], description: "Show keyboard shortcuts" },
      { keys: ["Esc"], description: "Close modal / exit focus mode" },
    ],
  },
  {
    title: "Study View",
    shortcuts: [
      { keys: ["F"], description: "Toggle focus mode" },
      { keys: ["M"], description: "Mark lesson complete / incomplete" },
      { keys: ["N"], description: "Next lesson" },
      { keys: ["P"], description: "Previous lesson" },
      { keys: ["→"], description: "Next lesson" },
      { keys: ["←"], description: "Previous lesson" },
    ],
  },
  {
    title: "Course Builder",
    shortcuts: [
      { keys: ["Ctrl", "S"], description: "Force save" },
      { keys: ["Ctrl", "N"], description: "New course" },
    ],
  },
];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border-default bg-bg-tertiary px-1.5 text-[10px] font-medium text-text-secondary">
      {children}
    </kbd>
  );
}

interface KeyboardShortcutsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcuts({ open, onOpenChange }: KeyboardShortcutsProps) {
  const { isMobile, mod, shift } = usePlatform();

  function resolveKey(k: string): string {
    if (k === "Ctrl") return mod;
    if (k === "Shift") return shift;
    return k;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            {isMobile
              ? "Keyboard shortcuts are not available on mobile."
              : "Navigate faster with these shortcuts."}
          </DialogDescription>
        </DialogHeader>

        {isMobile ? (
          <p className="py-4 text-center text-sm text-text-tertiary">
            Use a desktop or laptop to access keyboard shortcuts.
          </p>
        ) : (
          <div className="space-y-5 py-2">
            {SHORTCUT_GROUPS.map((group) => (
              <div key={group.title}>
                <h4 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                  {group.title}
                </h4>
                <div className="space-y-1.5">
                  {group.shortcuts.map((shortcut, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg px-2 py-1.5 transition-colors hover:bg-bg-tertiary"
                    >
                      <span className="text-sm text-text-primary">
                        {shortcut.description}
                      </span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((k, i) => (
                          <span key={i} className="flex items-center gap-1">
                            {i > 0 && (
                              <span className="text-[10px] text-text-tertiary">+</span>
                            )}
                            <Kbd>{resolveKey(k)}</Kbd>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
