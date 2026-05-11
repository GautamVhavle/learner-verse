/**
 * LiviChatPanel - right-side resizable chat panel.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { PanelLeftOpen, PanelLeftClose, Sparkles, RotateCcw, Plus, X } from "lucide-react";
import { ChatMessageList } from "./ChatMessageList";
import { ChatInput } from "./ChatInput";
import { ChatEmptyState } from "./ChatEmptyState";
import { ChatThreadList } from "./ChatThreadList";
import { useLiviChat } from "@/hooks/useLiviChat";
import { useChatStore } from "@/stores/chatStore";
import { useProGate } from "@/hooks/useProGate";

const MIN_WIDTH = 360;
const MAX_WIDTH = 700;
const DEFAULT_WIDTH = 440;

export function LiviChatPanel() {
  const { isOpen, closeChat, activeThreadId, isThreadListOpen, toggleThreadList, startNewChat } =
    useChatStore();

  const { messages, status, error, threadLoading, sendMessage, stop, loadThread, clearMessages } =
    useLiviChat();

  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const isDragging = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Clear messages when starting a new chat
  const prevThreadRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeThreadId && prevThreadRef.current) {
      clearMessages();
    }
    prevThreadRef.current = activeThreadId;
  }, [activeThreadId, clearMessages]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeChat();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, closeChat]);

  // Drag-to-resize handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const startX = e.clientX;
      const startWidth = width;

      const handleMouseMove = (ev: MouseEvent) => {
        if (!isDragging.current) return;
        const delta = startX - ev.clientX;
        const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + delta));
        setWidth(newWidth);
      };

      const handleMouseUp = () => {
        isDragging.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [width],
  );

  const hasMessages = messages.length > 0;
  const { isPro, showGate, ProGate } = useProGate();

  // When a non-Pro user opens the chat panel, show the upgrade gate
  // and close the panel when they dismiss it.
  useEffect(() => {
    if (isOpen && !isPro) {
      showGate();
    }
  }, [isOpen, isPro, showGate]);

  if (!isOpen) return null;

  // Free users see the upgrade dialog instead of the chat panel
  if (!isPro) {
    return <ProGate />;
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/40 transition-opacity" onClick={closeChat} />

      {/* Panel */}
      <div
        ref={panelRef}
        style={{ width }}
        className="border-border-primary bg-bg-primary fixed inset-y-0 right-0 z-50 flex flex-col border-l shadow-2xl transition-transform duration-200 ease-out"
      >
        {/* Drag handle - left edge */}
        <div
          onMouseDown={handleMouseDown}
          className="hover:bg-accent-blue/40 active:bg-accent-blue/60 absolute inset-y-0 left-0 z-10 w-1 cursor-col-resize transition-colors"
        />

        {/* ── Header ─────────────────────────────────── */}
        <div className="border-border-primary flex h-12 shrink-0 items-center gap-2 border-b px-3">
          {/* Thread list toggle */}
          <button
            onClick={toggleThreadList}
            className="text-text-tertiary hover:bg-bg-tertiary hover:text-text-primary flex size-7 items-center justify-center rounded-md transition-colors"
            title={isThreadListOpen ? "Hide chats" : "Show chats"}
          >
            {isThreadListOpen ? (
              <PanelLeftClose className="size-4" />
            ) : (
              <PanelLeftOpen className="size-4" />
            )}
          </button>

          {/* Title */}
          <div className="flex flex-1 items-center gap-1.5">
            <Sparkles className="text-accent-purple size-3.5" />
            <span className="text-text-primary text-[13px] font-semibold">LiVi</span>
            <span className="bg-accent-purple/10 text-accent-purple rounded px-1 py-px text-[9px] font-medium">
              AI
            </span>
          </div>

          {/* New chat */}
          <button
            onClick={startNewChat}
            className="text-text-tertiary hover:bg-bg-tertiary hover:text-text-primary flex size-7 items-center justify-center rounded-md transition-colors"
            title="New chat"
          >
            <Plus className="size-4" />
          </button>

          {/* Close */}
          <button
            onClick={closeChat}
            className="text-text-tertiary hover:bg-bg-tertiary hover:text-text-primary flex size-7 items-center justify-center rounded-md transition-colors"
            title="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────── */}
        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          {/* Thread list drawer - slides in from left, partial width with shadow */}
          <div
            className={`absolute inset-y-0 left-0 z-20 w-56 transition-transform duration-200 ease-in-out ${
              isThreadListOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="h-full shadow-[4px_0_16px_-4px_rgba(0,0,0,0.2)]">
              <ChatThreadList
                onSelectThread={(id) => {
                  loadThread(id);
                  toggleThreadList();
                }}
              />
            </div>
          </div>
          {/* Scrim behind drawer */}
          {isThreadListOpen && (
            <div
              className="absolute inset-0 z-10 bg-black/15 transition-opacity"
              onClick={toggleThreadList}
            />
          )}

          {/* Chat area */}
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            {hasMessages ? (
              <ChatMessageList messages={messages} status={status} isLoading={threadLoading} />
            ) : (
              <ChatEmptyState onSuggestionClick={sendMessage} />
            )}

            {/* Error bar */}
            {error && (
              <div className="border-accent-red/20 bg-accent-red/5 flex items-center gap-2 border-t px-3 py-1.5">
                <p className="text-accent-red flex-1 text-[11px]">{error}</p>
                <button
                  onClick={() => {
                    const last = messages.findLast((m) => m.role === "user");
                    if (last) sendMessage(last.content);
                  }}
                  className="text-accent-red hover:bg-accent-red/10 flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] transition-colors"
                >
                  <RotateCcw className="size-3" />
                  Retry
                </button>
              </div>
            )}

            <ChatInput onSend={sendMessage} onStop={stop} status={status} />
          </div>
        </div>
      </div>
    </>
  );
}
