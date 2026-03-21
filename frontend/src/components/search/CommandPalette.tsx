/**
 * Keyboard-driven command palette for searching courses, lessons, and notes.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BookOpen,
  FileText,
  GraduationCap,
  Layers,
  Search,
  StickyNote,
} from "lucide-react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { useSearchQuery } from "@/hooks/useSearch";
import { useModeAwareNavigate } from "@/hooks/useModeAwareNavigate";
import type { SearchResultItem } from "@/types/search";

// ── Type icons ──────────────────────────────────────────────

const TYPE_META: Record<
  string,
  { icon: typeof GraduationCap; label: string; color: string }
> = {
  course: {
    icon: GraduationCap,
    label: "Course",
    color: "text-accent-blue",
  },
  section: { icon: Layers, label: "Section", color: "text-accent-purple" },
  lesson: { icon: BookOpen, label: "Lesson", color: "text-accent-green" },
  note: { icon: StickyNote, label: "Reading Lesson", color: "text-amber-400" },
};

// ── Component ───────────────────────────────────────────────

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useModeAwareNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  // Debounce query (250ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isFetching } = useSearchQuery(debouncedQuery);
  const results = data?.results ?? [];

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setDebouncedQuery("");
      setActiveIndex(0);
      // Focus input after dialog animation
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Clamp active index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [results.length]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const active = listRef.current.querySelector(
      `[data-index="${activeIndex}"]`,
    );
    if (active && typeof active.scrollIntoView === "function") {
      active.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  const handleSelect = useCallback(
    (item: SearchResultItem) => {
      onOpenChange(false);
      navigate(item.url);
    },
    [navigate, onOpenChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && results[activeIndex]) {
        e.preventDefault();
        handleSelect(results[activeIndex]);
      }
    },
    [results, activeIndex, handleSelect],
  );

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup
          className="fixed top-[15%] left-1/2 z-50 w-full max-w-[560px] -translate-x-1/2 rounded-xl border border-border-default bg-bg-primary shadow-2xl outline-none data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-top-2 data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-top-2"
          data-testid="command-palette"
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 border-b border-border-default px-4">
            <Search className="size-4 shrink-0 text-text-tertiary" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search courses, lessons, notes..."
              className="h-12 w-full bg-transparent text-sm text-text-primary placeholder:text-text-tertiary outline-none"
              data-testid="command-palette-input"
              autoComplete="off"
              spellCheck={false}
            />
            <kbd className="hidden shrink-0 rounded-md border border-border-default bg-bg-tertiary px-1.5 py-0.5 text-[10px] font-medium text-text-tertiary sm:inline-block">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div
            ref={listRef}
            className="max-h-[360px] overflow-y-auto overscroll-contain p-2"
            role="listbox"
            data-testid="command-palette-results"
          >
            {/* Loading state */}
            {isFetching && query.trim() && (
              <div className="flex items-center justify-center py-8">
                <div className="size-5 animate-spin rounded-full border-2 border-text-tertiary border-t-accent-blue" />
              </div>
            )}

            {/* Empty query */}
            {!query.trim() && !isFetching && (
              <div className="py-8 text-center">
                <Search className="mx-auto mb-2 size-8 text-text-tertiary/50" />
                <p className="text-sm text-text-secondary">
                  Search across all your content
                </p>
                <p className="mt-1 text-xs text-text-tertiary">
                  Courses, lessons, sections, and notes
                </p>
              </div>
            )}

            {/* No results */}
            {query.trim() &&
              !isFetching &&
              debouncedQuery === query.trim() &&
              results.length === 0 && (
                <div className="py-8 text-center">
                  <FileText className="mx-auto mb-2 size-8 text-text-tertiary/50" />
                  <p className="text-sm text-text-secondary">
                    No results for &ldquo;{query.trim()}&rdquo;
                  </p>
                  <p className="mt-1 text-xs text-text-tertiary">
                    Try a different search term
                  </p>
                </div>
              )}

            {/* Result items */}
            {results.map((item, index) => {
              const meta = TYPE_META[item.type] ?? TYPE_META.course;
              const Icon = meta.icon;
              const isActive = index === activeIndex;

              return (
                <button
                  key={`${item.type}-${item.id}`}
                  data-index={index}
                  role="option"
                  aria-selected={isActive}
                  className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                    isActive
                      ? "bg-bg-tertiary"
                      : "hover:bg-bg-secondary"
                  }`}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <div
                    className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-bg-tertiary ${meta.color}`}
                  >
                    <Icon className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {item.title}
                    </p>
                    {item.description && (
                      <p className="mt-0.5 truncate text-xs text-text-secondary">
                        {item.description}
                      </p>
                    )}
                    <p className="mt-0.5 truncate text-[11px] text-text-tertiary">
                      {item.breadcrumb}
                    </p>
                  </div>
                  <span
                    className={`mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${meta.color} bg-bg-tertiary`}
                  >
                    {meta.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Footer */}
          {results.length > 0 && (
            <div className="flex items-center gap-4 border-t border-border-default px-4 py-2">
              <span className="flex items-center gap-1 text-[11px] text-text-tertiary">
                <kbd className="rounded border border-border-default bg-bg-tertiary px-1 py-px text-[10px]">
                  ↑↓
                </kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1 text-[11px] text-text-tertiary">
                <kbd className="rounded border border-border-default bg-bg-tertiary px-1 py-px text-[10px]">
                  ↵
                </kbd>
                Open
              </span>
              <span className="ml-auto text-[11px] text-text-tertiary">
                {data?.total ?? 0} result{(data?.total ?? 0) !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
