/**
 * ChatInput - message input with file attachments, auto-resize, and send/stop.
 */
import { useState, useRef, useCallback } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { ArrowUp, Paperclip, Square, X } from "lucide-react";
import type { ChatStatus } from "@/hooks/useLiviChat";

interface ChatInputProps {
  onSend: (message: string, files?: File[]) => void;
  onStop: () => void;
  status: ChatStatus;
  disabled?: boolean;
}

const MAX_LENGTH = 4000;
const MAX_FILES = 3;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function ChatInput({ onSend, onStop, status, disabled }: ChatInputProps) {
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || status !== "ready" || disabled) return;
    onSend(trimmed, files.length > 0 ? files : undefined);
    setInput("");
    setFiles([]);
  }, [input, status, disabled, onSend, files]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    const valid = selected.filter((f) => f.size <= MAX_FILE_SIZE);
    setFiles((prev) => [...prev, ...valid].slice(0, MAX_FILES));
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const isStreaming = status === "streaming";
  const canSend = input.trim().length > 0 && status === "ready" && !disabled;

  return (
    <div className="border-border-primary bg-bg-primary border-t px-3 pt-2 pb-3">
      {/* File chips */}
      {files.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {files.map((f, i) => (
            <div
              key={`${f.name}-${i}`}
              className="border-border-primary bg-bg-secondary flex items-center gap-1.5 rounded-lg border px-2 py-1"
            >
              <span className="text-text-secondary max-w-[140px] truncate text-[11px]">
                {f.name}
              </span>
              <span className="text-text-tertiary text-[10px]">{formatSize(f.size)}</span>
              <button
                onClick={() => removeFile(i)}
                className="text-text-tertiary hover:bg-bg-tertiary hover:text-text-primary flex size-4 items-center justify-center rounded-full transition-colors"
              >
                <X className="size-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input container */}
      <div className="border-border-primary bg-bg-secondary focus-within:border-accent-blue/40 flex items-end gap-1.5 rounded-xl border transition-colors">
        {/* Attach button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isStreaming || files.length >= MAX_FILES}
          className="text-text-tertiary hover:text-text-secondary mb-1.5 ml-2 flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors disabled:opacity-30"
          title="Attach file"
        >
          <Paperclip className="size-4" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          accept=".txt,.pdf,.md,.csv,.json,.py,.js,.ts,.tsx,.jsx,.html,.css"
        />

        <TextareaAutosize
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, MAX_LENGTH))}
          onKeyDown={handleKeyDown}
          placeholder="Ask LiVi anything..."
          disabled={disabled}
          minRows={1}
          maxRows={5}
          className="text-text-primary placeholder:text-text-tertiary flex-1 resize-none bg-transparent py-2.5 text-[13px] leading-relaxed focus:outline-none disabled:opacity-50"
        />

        {isStreaming ? (
          <button
            onClick={onStop}
            className="bg-text-primary text-bg-root hover:bg-text-secondary mr-1.5 mb-1.5 flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors"
            title="Stop generating"
          >
            <Square className="size-3" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!canSend}
            className="bg-accent-blue hover:bg-accent-blue/90 mr-1.5 mb-1.5 flex size-7 shrink-0 items-center justify-center rounded-lg text-white transition-all disabled:opacity-20"
            title="Send message"
          >
            <ArrowUp className="size-3.5" />
          </button>
        )}
      </div>

      {/* Character counter */}
      {input.length > MAX_LENGTH * 0.9 && (
        <p className="text-text-tertiary mt-1 text-right text-[10px]">
          {input.length}/{MAX_LENGTH}
        </p>
      )}
    </div>
  );
}
