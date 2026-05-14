/**
 * LiviInlineChat - expandable contextual AI chat box.
 *
 * Renders as a collapsible bar that, when expanded, shows a lightweight
 * chat interface with Livi. Context (video/reading/quiz) is injected
 * via props so the AI is fully aware of the surrounding content.
 *
 * The AI is only activated when the user first sends a message.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { ChevronDown, Sparkles, ArrowUp, Square, Eraser } from "lucide-react";
import TextareaAutosize from "react-textarea-autosize";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeSanitize from "rehype-sanitize";
import { useInlineChat, type InlineContextType, type InlineMessage } from "@/hooks/useInlineChat";
import { useProGate } from "@/hooks/useProGate";

interface LiviInlineChatProps {
  contextType: InlineContextType;
  contextData: Record<string, unknown>;
  /** Label shown in the collapsed trigger bar */
  label?: string;
}

export function LiviInlineChat({ contextType, contextData, label }: LiviInlineChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { messages, status, error, sendMessage, stop, clear } = useInlineChat({
    contextType,
    contextData,
  });

  const { isPro, showGate, ProGate } = useProGate();

  const defaultLabel =
    contextType === "quiz"
      ? "Ask LiVi for a hint"
      : contextType === "video"
        ? "Ask LiVi about this video"
        : "Ask LiVi about this lesson";

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when expanded
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || status === "streaming") return;
    sendMessage(trimmed);
    setInput("");
  }, [input, status, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-border-default bg-bg-secondary overflow-hidden rounded-xl border">
      <ProGate />

      {/* Trigger bar */}
      <button
        onClick={() => {
          if (!isPro) {
            showGate();
            return;
          }
          setIsOpen((prev) => !prev);
        }}
        className="hover:bg-bg-tertiary flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors"
      >
        <div className="bg-accent-purple/10 flex size-5 items-center justify-center rounded-full">
          <Sparkles className="text-accent-purple size-3" />
        </div>
        <span className="text-text-secondary flex-1 text-xs font-medium">
          {label ?? defaultLabel}
        </span>
        {messages.length > 0 && (
          <span className="bg-accent-purple/10 text-accent-purple rounded-full px-1.5 py-0.5 text-[10px] font-medium">
            {messages.filter((m) => m.role === "user").length}
          </span>
        )}
        <ChevronDown
          className={`text-text-tertiary size-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Expandable content */}
      {isOpen && (
        <div className="border-border-default border-t">
          {/* Messages area */}
          {messages.length > 0 && (
            <div className="max-h-72 space-y-3 overflow-y-auto px-4 py-3">
              {messages.map((msg) => (
                <InlineMessageBubble
                  key={msg.id}
                  message={msg}
                  isStreaming={
                    status === "streaming" &&
                    msg.role === "assistant" &&
                    msg.id === messages[messages.length - 1]?.id
                  }
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Empty state */}
          {messages.length === 0 && (
            <div className="px-4 py-4 text-center">
              <Sparkles className="text-accent-purple/40 mx-auto size-5" />
              <p className="text-text-tertiary mt-1.5 text-xs">
                {contextType === "quiz"
                  ? "I'll help you think through this question - no spoilers!"
                  : "Ask me anything about this lesson content."}
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mx-4 mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Input area */}
          <div className="border-border-default flex items-center gap-2 border-t px-3 py-2">
            <TextareaAutosize
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={contextType === "quiz" ? "Ask for a hint…" : "Ask about this lesson…"}
              maxLength={2000}
              minRows={1}
              maxRows={3}
              className="text-text-primary placeholder:text-text-tertiary min-h-[28px] flex-1 resize-none bg-transparent py-1 text-xs leading-normal outline-none"
              disabled={status === "streaming"}
            />
            <div className="flex shrink-0 items-center gap-1">
              {messages.length > 0 && status !== "streaming" && (
                <button
                  onClick={clear}
                  className="text-text-tertiary hover:bg-bg-tertiary hover:text-text-secondary flex size-7 items-center justify-center rounded-lg transition-colors"
                  title="Clear chat"
                >
                  <Eraser className="size-3.5" />
                </button>
              )}
              {status === "streaming" ? (
                <button
                  onClick={stop}
                  className="flex size-7 items-center justify-center rounded-lg bg-red-500/10 text-red-500 transition-colors hover:bg-red-500/20"
                  title="Stop"
                >
                  <Square className="size-3" />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="bg-accent-purple hover:bg-accent-purple/90 flex size-7 items-center justify-center rounded-lg text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                  title="Send"
                >
                  <ArrowUp className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Compact message bubble for inline chat */
function InlineMessageBubble({
  message,
  isStreaming,
}: {
  message: InlineMessage;
  isStreaming?: boolean;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="bg-accent-blue max-w-[85%] rounded-xl rounded-br-sm px-3 py-1.5 text-xs leading-relaxed text-white">
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <div className="bg-accent-purple/10 mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full">
        <Sparkles className="text-accent-purple size-2.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="prose prose-sm dark:prose-invert text-text-primary prose-p:my-1 prose-pre:my-2 prose-pre:rounded-lg prose-pre:bg-[#1c1c1c] prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-headings:my-1.5 prose-headings:text-xs prose-code:rounded prose-code:bg-bg-tertiary prose-code:px-1 prose-code:py-0.5 prose-code:text-[11px] prose-code:before:content-none prose-code:after:content-none prose-a:text-accent-blue prose-a:no-underline hover:prose-a:underline max-w-none text-xs leading-relaxed">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight, rehypeSanitize]}
            components={{
              a: ({ ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
            }}
          >
            {message.content || " "}
          </ReactMarkdown>
          {isStreaming && (
            <span className="bg-accent-purple inline-block h-3 w-0.5 animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
}
