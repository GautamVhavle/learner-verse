/**
 * Markdown text editor with write, preview, and split-pane modes.
 */
import { useState, useCallback } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { Eye, Pencil, Columns2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "./MarkdownRenderer";

type ViewMode = "write" | "preview" | "split";

const MAX_LENGTH = 50_000;

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
}

export function MarkdownEditor({ value, onChange, onBlur }: MarkdownEditorProps) {
  const [mode, setMode] = useState<ViewMode>("write");

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const text = e.target.value;
      if (text.length <= MAX_LENGTH) {
        onChange(text);
      }
    },
    [onChange],
  );

  const charCount = value.length;
  const isNearLimit = charCount > MAX_LENGTH * 0.9;

  return (
    <div className="border-border-default bg-bg-primary overflow-hidden rounded-lg border">
      {/* Toolbar */}
      <div className="border-border-default flex items-center justify-between border-b px-3 py-1.5">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMode("write")}
            className={`h-7 gap-1.5 px-2 text-xs ${
              mode === "write" ? "bg-bg-tertiary text-text-primary" : "text-text-secondary"
            }`}
          >
            <Pencil className="size-3" />
            Write
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMode("preview")}
            className={`h-7 gap-1.5 px-2 text-xs ${
              mode === "preview" ? "bg-bg-tertiary text-text-primary" : "text-text-secondary"
            }`}
          >
            <Eye className="size-3" />
            Preview
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMode("split")}
            className={`hidden h-7 gap-1.5 px-2 text-xs md:inline-flex ${
              mode === "split" ? "bg-bg-tertiary text-text-primary" : "text-text-secondary"
            }`}
          >
            <Columns2 className="size-3" />
            Split
          </Button>
        </div>
        <span
          className={`text-xs tabular-nums ${
            isNearLimit ? "text-accent-amber" : "text-text-tertiary"
          }`}
        >
          {charCount.toLocaleString()} / {MAX_LENGTH.toLocaleString()}
        </span>
      </div>

      {/* Content area */}
      <div className={mode === "split" ? "divide-border-default grid grid-cols-2 divide-x" : ""}>
        {/* Editor */}
        {(mode === "write" || mode === "split") && (
          <TextareaAutosize
            value={value}
            onChange={handleChange}
            onBlur={onBlur}
            minRows={6}
            maxRows={24}
            placeholder="Write your notes in markdown..."
            className="text-text-primary placeholder:text-text-tertiary w-full resize-none bg-transparent px-3 py-3 font-mono text-sm outline-none"
            spellCheck={false}
          />
        )}

        {/* Preview */}
        {(mode === "preview" || mode === "split") && (
          <div className="min-h-[150px] px-3 py-3">
            {value ? (
              <MarkdownRenderer content={value} />
            ) : (
              <p className="text-text-tertiary text-sm italic">Nothing to preview</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
