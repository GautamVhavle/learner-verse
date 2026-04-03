/**
 * LiviChatPanel — right-side Sheet chat interface.
 */
import { useEffect, useRef } from "react";
import {
  PanelLeftOpen,
  PanelLeftClose,
  Sparkles,
  RotateCcw,
  Plus,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { ChatMessageList } from "./ChatMessageList";
import { ChatInput } from "./ChatInput";
import { ChatEmptyState } from "./ChatEmptyState";
import { ChatThreadList } from "./ChatThreadList";
import { useLiviChat } from "@/hooks/useLiviChat";
import { useChatStore } from "@/stores/chatStore";

export function LiviChatPanel() {
  const {
    isOpen,
    closeChat,
    activeThreadId,
    isThreadListOpen,
    toggleThreadList,
    startNewChat,
  } = useChatStore();

  const {
    messages,
    status,
    error,
    threadLoading,
    sendMessage,
    stop,
    loadThread,
    clearMessages,
  } = useLiviChat();

  // Clear messages when starting a new chat
  const prevThreadRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeThreadId && prevThreadRef.current) {
      clearMessages();
    }
    prevThreadRef.current = activeThreadId;
  }, [activeThreadId, clearMessages]);

  const hasMessages = messages.length > 0;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeChat()}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex w-full flex-col gap-0 overflow-hidden border-l border-border-primary bg-bg-primary p-0 shadow-2xl sm:max-w-[400px]"
      >
        {/* ── Header ─────────────────────────────────── */}
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border-primary px-3">
          {/* Thread list toggle */}
          <button
            onClick={toggleThreadList}
            className="flex size-7 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
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
            <Sparkles className="size-3.5 text-accent-purple" />
            <SheetTitle className="text-[13px] font-semibold">
              LiVi
            </SheetTitle>
            <span className="rounded bg-accent-purple/10 px-1 py-px text-[9px] font-medium text-accent-purple">
              AI
            </span>
          </div>

          {/* New chat */}
          <button
            onClick={startNewChat}
            className="flex size-7 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
            title="New chat"
          >
            <Plus className="size-4" />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────── */}
        <div className="flex min-h-0 flex-1">
          {/* Thread list drawer */}
          <div
            className={`shrink-0 overflow-hidden transition-all duration-200 ease-in-out ${
              isThreadListOpen ? "w-52" : "w-0"
            }`}
          >
            <div className="w-52">
              <ChatThreadList onSelectThread={loadThread} />
            </div>
          </div>

          {/* Chat area */}
          <div className="flex min-w-0 flex-1 flex-col">
            {hasMessages ? (
              <ChatMessageList
                messages={messages}
                status={status}
                isLoading={threadLoading}
              />
            ) : (
              <ChatEmptyState onSuggestionClick={sendMessage} />
            )}

            {/* Error bar */}
            {error && (
              <div className="flex items-center gap-2 border-t border-accent-red/20 bg-accent-red/5 px-3 py-1.5">
                <p className="flex-1 text-[11px] text-accent-red">{error}</p>
                <button
                  onClick={() => {
                    const last = messages.findLast((m) => m.role === "user");
                    if (last) sendMessage(last.content);
                  }}
                  className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-accent-red transition-colors hover:bg-accent-red/10"
                >
                  <RotateCcw className="size-3" />
                  Retry
                </button>
              </div>
            )}

            <ChatInput
              onSend={sendMessage}
              onStop={stop}
              status={status}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
