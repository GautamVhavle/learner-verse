/**
 * ChatMessageList — scrollable container with auto-scroll and thinking state.
 */
import { useEffect, useRef, useCallback, useState } from "react";
import { ArrowDown, Loader2 } from "lucide-react";
import { ChatMessageBubble } from "./ChatMessageBubble";
import { ThinkingIndicator } from "./ThinkingIndicator";
import type { UIMessage, ChatStatus } from "@/hooks/useLiviChat";

interface ChatMessageListProps {
  messages: UIMessage[];
  status: ChatStatus;
  isLoading?: boolean;
}

export function ChatMessageList({
  messages,
  status,
  isLoading,
}: ChatMessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const userScrolledRef = useRef(false);

  const scrollToBottom = useCallback((instant?: boolean) => {
    bottomRef.current?.scrollIntoView({
      behavior: instant ? "instant" : "smooth",
    });
  }, []);

  // Auto-scroll when messages change — but not if user has scrolled up
  useEffect(() => {
    if (!userScrolledRef.current) {
      // Use requestAnimationFrame for smoother scroll after DOM update
      requestAnimationFrame(() => scrollToBottom());
    }
  }, [messages, status, scrollToBottom]);

  // Reset user-scrolled flag when a new user message is sent
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === "user") {
      userScrolledRef.current = false;
      requestAnimationFrame(() => scrollToBottom(true));
    }
  }, [messages.length, messages, scrollToBottom]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    setShowScrollBtn(!nearBottom);
    // If user scrolls up, stop auto-scrolling
    userScrolledRef.current = !nearBottom;
  }, []);

  // Determine if we should show thinking indicator
  const showThinking =
    status === "streaming" &&
    messages.length > 0 &&
    (messages[messages.length - 1].role === "user" ||
      (messages[messages.length - 1].role === "assistant" &&
        !messages[messages.length - 1].content));

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-text-tertiary" />
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex h-full flex-col gap-4 overflow-y-auto px-4 py-4 scroll-smooth"
      >
        {messages.map((msg, i) => {
          // Skip the empty assistant bubble when thinking indicator is visible
          const isLastEmpty =
            i === messages.length - 1 &&
            msg.role === "assistant" &&
            !msg.content;
          if (showThinking && isLastEmpty) return null;

          return (
            <ChatMessageBubble
              key={msg.id}
              message={msg}
              isStreaming={
                status === "streaming" &&
                msg.role === "assistant" &&
                i === messages.length - 1 &&
                !!msg.content
              }
            />
          );
        })}

        {showThinking && <ThinkingIndicator />}

        <div ref={bottomRef} className="h-px shrink-0" />
      </div>

      {/* Scroll to bottom */}
      {showScrollBtn && (
        <button
          onClick={() => {
            userScrolledRef.current = false;
            scrollToBottom();
          }}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-border-primary bg-bg-secondary p-1.5 shadow-md transition-all hover:bg-bg-tertiary hover:shadow-lg"
        >
          <ArrowDown className="size-3.5 text-text-secondary" />
        </button>
      )}
    </div>
  );
}
