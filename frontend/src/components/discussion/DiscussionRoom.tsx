/**
 * DiscussionRoom — per-course group chat UI.
 *
 * Features:
 * - Cursor-paginated message list (load older on scroll-up)
 * - Role badges: Learner / Creator / AI Assistant
 * - Reply-to threading with inline preview
 * - @MiVi mention support with autocomplete hint
 * - Auto-scroll to bottom on new messages
 * - Polling for new messages every 5s
 */
import { useState, useRef, useEffect, useCallback } from "react";
import TextareaAutosize from "react-textarea-autosize";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import {
  MessageSquare,
  ArrowUp,
  Loader2,
  ChevronUp,
  Reply,
  X,
  Sparkles,
  AtSign,
} from "lucide-react";
import {
  useDiscussionMessages,
  useSendDiscussionMessage,
} from "@/hooks/useDiscussion";
import { useQueryClient } from "@tanstack/react-query";
import type { DiscussionMessage } from "@/types/discussion";
import { useProGate } from "@/hooks/useProGate";

/* ── Role Config ───────────────────────────────────── */

const ROLE_CONFIG = {
  creator: {
    label: "Creator",
    bg: "bg-accent-blue/10",
    text: "text-accent-blue",
    border: "border-accent-blue/20",
    dot: "bg-accent-blue",
  },
  learner: {
    label: "Learner",
    bg: "bg-accent-green/10",
    text: "text-accent-green",
    border: "border-accent-green/20",
    dot: "bg-accent-green",
  },
  ai: {
    label: "AI Assistant",
    bg: "bg-accent-purple/10",
    text: "text-accent-purple",
    border: "border-accent-purple/20",
    dot: "bg-accent-purple",
  },
} as const;

/* ── Component ─────────────────────────────────────── */

interface DiscussionRoomProps {
  courseId: string;
}

export function DiscussionRoom({ courseId }: DiscussionRoomProps) {
  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState<DiscussionMessage | null>(null);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [allMessages, setAllMessages] = useState<DiscussionMessage[]>([]);
  const [showMiviHint, setShowMiviHint] = useState(false);
  const { isPro, showGate, ProGate } = useProGate();

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isAtBottom = useRef(true);
  const prevMessageCount = useRef(0);

  const { data, isLoading, isFetching } = useDiscussionMessages(courseId, cursor);
  const sendMutation = useSendDiscussionMessage(courseId);
  const qc = useQueryClient();

  // Track whether we've ever loaded data (prevents flicker on refetch polls)
  const hasLoadedOnce = useRef(false);

  /* ── Merge messages (stable — only update when IDs actually change) ── */
  const lastDataRef = useRef<string>("");
  useEffect(() => {
    if (!data?.items) return;
    hasLoadedOnce.current = true;
    if (data.items.length === 0) return;
    // Fingerprint the incoming batch so we skip no-op re-renders
    const fingerprint = data.items.map((m) => m.id).join(",");
    if (fingerprint === lastDataRef.current) return;
    lastDataRef.current = fingerprint;

    setAllMessages((prev) => {
      // Remove optimistic messages that now have real counterparts
      const withoutOptimistic = prev.filter(
        (m) => !m.id.startsWith("optimistic-")
      );
      const existing = new Set(withoutOptimistic.map((m) => m.id));
      const newOnes = data.items.filter((m) => !existing.has(m.id));
      if (newOnes.length === 0 && withoutOptimistic.length === prev.length)
        return prev; // no change
      if (cursor) {
        return [...newOnes, ...withoutOptimistic];
      }
      const merged = [...withoutOptimistic, ...newOnes];
      merged.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      return merged;
    });
  }, [data, cursor]);

  // True initial loading — first fetch ever
  const showInitialLoading = isLoading && !hasLoadedOnce.current;
  // Empty state — only after first successful load
  const showEmptyState = hasLoadedOnce.current && allMessages.length === 0;

  /* ── Auto-scroll on new messages ── */
  useEffect(() => {
    if (allMessages.length > prevMessageCount.current && isAtBottom.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMessageCount.current = allMessages.length;
  }, [allMessages.length]);

  /* ── Track scroll position ── */
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const threshold = 80;
    isAtBottom.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  }, []);

  /* ── Load older ── */
  const loadOlder = () => {
    if (allMessages.length > 0 && data?.has_more) {
      setCursor(allMessages[0].created_at);
    }
  };

  /* ── Send (optimistic) ── */
  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || sendMutation.isPending) return;

    // Gate @MiVi mentions behind Pro
    if (!isPro && trimmed.toLowerCase().includes("@mivi")) {
      showGate();
      return;
    }

    const replySnapshot = replyTo;

    // Optimistic message — show immediately
    const optimisticMsg: DiscussionMessage = {
      id: `optimistic-${Date.now()}`,
      course_id: courseId,
      user_id: "me",
      role: "learner",
      display_name: "You",
      content: trimmed,
      reply_to_id: replySnapshot?.id ?? null,
      reply_preview: replySnapshot
        ? {
            id: replySnapshot.id,
            display_name: replySnapshot.display_name,
            role: replySnapshot.role,
            content: replySnapshot.content.slice(0, 120),
          }
        : null,
      created_at: new Date().toISOString(),
    };

    setAllMessages((prev) => [...prev, optimisticMsg]);
    setInput("");
    setReplyTo(null);
    setShowMiviHint(false);
    isAtBottom.current = true;

    sendMutation.mutate(
      { content: trimmed, reply_to_id: replySnapshot?.id ?? null },
      {
        onSuccess: () => {
          // Replace optimistic with real data on next poll
          qc.invalidateQueries({ queryKey: ["discussion", courseId] });
        },
        onError: () => {
          // Remove optimistic message on failure
          setAllMessages((prev) =>
            prev.filter((m) => m.id !== optimisticMsg.id)
          );
        },
      }
    );
  };

  /* ── @MiVi hint ── */
  const handleInputChange = (val: string) => {
    setInput(val);
    setShowMiviHint(val.includes("@") && !val.toLowerCase().includes("@mivi"));
  };

  const insertMiVi = () => {
    if (!isPro) { showGate(); return; }
    const atIdx = input.lastIndexOf("@");
    const before = atIdx >= 0 ? input.slice(0, atIdx) : input;
    setInput(before + "@MiVi ");
    setShowMiviHint(false);
    inputRef.current?.focus();
  };

  /* ── Empty state ── */
  if (showEmptyState) {
    return (
      <div className="flex h-full flex-col">
        <ProGate />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16">
          <div className="flex size-12 items-center justify-center rounded-xl bg-accent-purple/10">
            <MessageSquare className="size-5 text-accent-purple" />
          </div>
          <h3 className="text-sm font-semibold text-text-primary">
            Discussion Room
          </h3>
          <p className="max-w-xs text-center text-xs text-text-secondary">
            Start the conversation! Ask questions, share insights, or tag{" "}
            <span className="font-semibold text-accent-purple">@MiVi</span> for
            AI-powered help.
          </p>
        </div>
        <InputBar
          input={input}
          onChange={handleInputChange}
          onSend={handleSend}
          isPending={sendMutation.isPending}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          showMiviHint={showMiviHint}
          onInsertMivi={insertMiVi}
          inputRef={inputRef}
        />
      </div>
    );
  }

  /* ── Initial loading ── */
  if (showInitialLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-5 animate-spin text-text-tertiary" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <ProGate />
      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        {/* Load older button */}
        {data?.has_more && (
          <div className="flex justify-center py-3">
            <button
              onClick={loadOlder}
              disabled={isFetching}
              className="flex items-center gap-1.5 rounded-full border border-border-default px-3 py-1.5 text-[11px] font-medium text-text-secondary transition-colors hover:bg-bg-secondary disabled:opacity-50"
            >
              {isFetching ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <ChevronUp className="size-3" />
              )}
              Load older messages
            </button>
          </div>
        )}

        <div className="space-y-0.5 px-4 py-3">
          {allMessages.map((msg, i) => {
              const prev = i > 0 ? allMessages[i - 1] : null;
              const showHeader =
                !prev ||
                prev.user_id !== msg.user_id ||
                prev.role !== msg.role ||
                new Date(msg.created_at).getTime() -
                  new Date(prev.created_at).getTime() >
                  300_000; // 5 min gap

              return (
                <ChatBubble
                  key={msg.id}
                  message={msg}
                  showHeader={showHeader}
                  onReply={() => {
                    setReplyTo(msg);
                    inputRef.current?.focus();
                  }}
                />
              );
            })}
            <div ref={bottomRef} />
          </div>
      </div>

      {/* Input */}
      <InputBar
        input={input}
        onChange={handleInputChange}
        onSend={handleSend}
        isPending={sendMutation.isPending}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        showMiviHint={showMiviHint}
        onInsertMivi={insertMiVi}
        inputRef={inputRef}
      />
    </div>
  );
}

/* ═══════════════════════ Chat Bubble ═══════════════════════ */

function ChatBubble({
  message,
  showHeader,
  onReply,
}: {
  message: DiscussionMessage;
  showHeader: boolean;
  onReply: () => void;
}) {
  const role = ROLE_CONFIG[message.role] ?? ROLE_CONFIG.learner;
  const time = new Date(message.created_at).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const isAI = message.role === "ai";

  return (
    <div
      className={`group relative rounded-lg px-3 py-1.5 transition-colors hover:bg-bg-secondary ${
        showHeader ? "mt-3" : "mt-0"
      } ${isAI ? "border-l-2 border-accent-purple/30 bg-accent-purple/[0.03]" : ""}`}
    >
      {/* Reply preview */}
      {message.reply_preview && (
        <div className="mb-1.5 flex items-start gap-1.5 rounded border-l-2 border-text-tertiary/30 bg-bg-tertiary/30 px-2 py-1">
          <Reply className="mt-0.5 size-3 shrink-0 text-text-tertiary" />
          <div className="min-w-0">
            <span className="text-[10px] font-semibold text-text-secondary">
              {message.reply_preview.display_name}
            </span>
            <p className="truncate text-[11px] text-text-tertiary">
              {message.reply_preview.content}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      {showHeader && (
        <div className="mb-0.5 flex items-center gap-2">
          {/* Avatar */}
          <div
            className={`flex size-6 items-center justify-center rounded-full text-[10px] font-bold ${role.bg} ${role.text}`}
          >
            {isAI ? (
              <Sparkles className="size-3" />
            ) : (
              message.display_name.charAt(0).toUpperCase()
            )}
          </div>

          <span className="text-xs font-semibold text-text-primary">
            {message.display_name}
          </span>

          <span
            className={`rounded-full border px-1.5 py-px text-[9px] font-semibold ${role.bg} ${role.text} ${role.border}`}
          >
            {role.label}
          </span>

          <span className="text-[10px] text-text-tertiary">{time}</span>
        </div>
      )}

      {/* Content */}
      <div
        className={`text-[13px] leading-relaxed text-text-primary ${
          showHeader ? "pl-8" : "pl-8"
        }`}
      >
        <MessageContent content={message.content} role={message.role} />
      </div>

      {/* Reply button */}
      <button
        onClick={onReply}
        className="absolute right-2 top-1.5 hidden items-center gap-1 rounded border border-border-default bg-bg-primary px-1.5 py-0.5 text-[10px] font-medium text-text-secondary shadow-sm transition-all hover:bg-bg-secondary group-hover:flex"
      >
        <Reply className="size-2.5" />
        Reply
      </button>
    </div>
  );
}

/* ═══════════════════════ Message Content ═══════════════════════ */

function MessageContent({ content, role }: { content: string; role: string }) {
  // AI messages — render markdown with full typography
  if (role === "ai") {
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none text-[13px] leading-relaxed text-text-primary prose-p:my-1 prose-pre:my-2 prose-pre:rounded-lg prose-pre:bg-[#1c1c1c] prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-1.5 prose-headings:text-sm prose-code:rounded prose-code:bg-bg-tertiary prose-code:px-1 prose-code:py-0.5 prose-code:text-xs prose-code:before:content-none prose-code:after:content-none prose-a:text-accent-purple prose-a:no-underline hover:prose-a:underline">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            a: ({ ...props }) => (
              <a {...props} target="_blank" rel="noopener noreferrer" />
            ),
            pre: ({ children, ...props }) => (
              <pre {...props} className="overflow-x-auto rounded-lg bg-[#1c1c1c] p-3 text-xs">
                {children}
              </pre>
            ),
          }}
        >
          {content || " "}
        </ReactMarkdown>
      </div>
    );
  }

  // User messages — highlight @mentions
  const parts = content.split(/(@\w+)/g);
  return (
    <p className="whitespace-pre-wrap break-words">
      {parts.map((part, i) => {
        if (part.match(/^@[Mm]i[Vv]i$/)) {
          return (
            <span
              key={i}
              className="inline-flex items-center gap-0.5 rounded bg-accent-purple/10 px-1 py-px text-xs font-semibold text-accent-purple"
            >
              <Sparkles className="size-2.5" />
              {part}
            </span>
          );
        }
        if (part.startsWith("@")) {
          return (
            <span
              key={i}
              className="rounded bg-accent-blue/10 px-1 py-px text-xs font-semibold text-accent-blue"
            >
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}

/* ═══════════════════════ Input Bar ═══════════════════════ */

function InputBar({
  input,
  onChange,
  onSend,
  isPending,
  replyTo,
  onCancelReply,
  showMiviHint,
  onInsertMivi,
  inputRef,
}: {
  input: string;
  onChange: (v: string) => void;
  onSend: () => void;
  isPending: boolean;
  replyTo: DiscussionMessage | null;
  onCancelReply: () => void;
  showMiviHint: boolean;
  onInsertMivi: () => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  return (
    <div className="shrink-0 border-t border-border-default bg-bg-primary px-3 pb-3 pt-2">
      {/* MiVi suggestion */}
      {showMiviHint && (
        <button
          onClick={onInsertMivi}
          className="mb-2 flex w-full items-center gap-2 rounded-lg border border-accent-purple/20 bg-accent-purple/[0.04] px-3 py-1.5 text-xs transition-all hover:bg-accent-purple/[0.08]"
        >
          <Sparkles className="size-3 text-accent-purple" />
          <span className="text-text-secondary">
            Tag <span className="font-semibold text-accent-purple">@MiVi</span>{" "}
            for AI help
          </span>
        </button>
      )}

      {/* Reply indicator */}
      {replyTo && (
        <div className="mb-2 flex items-center justify-between rounded-lg bg-bg-secondary px-3 py-1.5">
          <div className="flex items-center gap-2 text-xs">
            <Reply className="size-3 text-accent-purple" />
            <span className="text-text-tertiary">Replying to</span>
            <span className="font-semibold text-text-primary">
              {replyTo.display_name}
            </span>
          </div>
          <button
            onClick={onCancelReply}
            className="flex size-5 items-center justify-center rounded-full text-text-tertiary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
          >
            <X className="size-3" />
          </button>
        </div>
      )}

      {/* Input container — matches LiVi ChatInput style */}
      <div className="flex items-end gap-1.5 rounded-xl border border-border-default bg-bg-secondary transition-colors focus-within:border-accent-purple/40">
        {/* @MiVi shortcut */}
        <button
          onClick={onInsertMivi}
          className="mb-1.5 ml-2 flex size-7 shrink-0 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:text-accent-purple"
          title="Mention @MiVi"
        >
          <AtSign className="size-4" />
        </button>

        <TextareaAutosize
          ref={inputRef}
          value={input}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder="Type a message…"
          minRows={1}
          maxRows={5}
          className="flex-1 resize-none bg-transparent py-2.5 text-[13px] leading-relaxed text-text-primary placeholder:text-text-tertiary focus:outline-none"
        />

        {/* Send button */}
        <button
          onClick={onSend}
          disabled={!input.trim() || isPending}
          className="mb-1.5 mr-1.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent-purple text-white transition-all hover:bg-accent-purple/90 disabled:opacity-20"
          title="Send message"
        >
          {isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <ArrowUp className="size-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}
