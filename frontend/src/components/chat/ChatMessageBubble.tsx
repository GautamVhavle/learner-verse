/**
 * ChatMessageBubble — clean, left-aligned message display.
 *
 * User messages are right-aligned minimal bubbles.
 * Assistant messages are full-width with markdown, no bubble.
 */
import { memo, useState } from "react";
import { Check, Copy, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import type { UIMessage } from "@/hooks/useLiviChat";

interface ChatMessageBubbleProps {
  message: UIMessage;
  isStreaming?: boolean;
}

export const ChatMessageBubble = memo(function ChatMessageBubble({
  message,
  isStreaming,
}: ChatMessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-accent-blue px-3.5 py-2 text-[13px] leading-relaxed text-white">
          <p className="whitespace-pre-wrap">{message.content}</p>
          {/* Attached files */}
          {message.files && message.files.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {message.files.map((f) => (
                <span
                  key={f.name}
                  className="inline-flex items-center gap-1 rounded-md bg-white/15 px-2 py-0.5 text-[11px] text-white/90"
                >
                  📎 {f.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="group flex items-start gap-2.5">
      {/* Avatar */}
      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-purple/10">
        <Sparkles className="size-3 text-accent-purple" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="prose prose-sm dark:prose-invert max-w-none text-[13px] leading-relaxed text-text-primary prose-p:my-1.5 prose-pre:my-2.5 prose-pre:rounded-lg prose-pre:bg-[#1c1c1c] prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-headings:my-2 prose-headings:text-sm prose-code:rounded prose-code:bg-bg-tertiary prose-code:px-1 prose-code:py-0.5 prose-code:text-xs prose-code:before:content-none prose-code:after:content-none prose-a:text-accent-blue prose-a:no-underline hover:prose-a:underline">
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
            {message.content || " "}
          </ReactMarkdown>
          {isStreaming && (
            <span className="inline-block h-4 w-0.5 animate-pulse bg-accent-purple" />
          )}
        </div>

        {/* Actions row — shows on hover */}
        {!isStreaming && message.content && (
          <div className="mt-1 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-text-tertiary transition-colors hover:bg-bg-tertiary hover:text-text-secondary"
              title="Copy"
            >
              {copied ? (
                <>
                  <Check className="size-3 text-accent-green" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="size-3" />
                  Copy
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
