/**
 * Input field that fetches Open Graph metadata and adds a reference link.
 */
import { useState, useCallback } from "react";
import { Plus, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFetchOpenGraph } from "@/hooks/useSections";
import type { ReferenceLinkCreate } from "@/types/section";

interface LinkInputProps {
  onAdd: (data: ReferenceLinkCreate) => void;
  disabled?: boolean;
}

function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function LinkInput({ onAdd, disabled }: LinkInputProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fetchOG = useFetchOpenGraph();

  const handleAdd = useCallback(async () => {
    const trimmed = url.trim();
    if (!trimmed) return;

    if (!isValidUrl(trimmed)) {
      setError("Please enter a valid URL (https://...)");
      return;
    }

    setError(null);

    try {
      const og = await fetchOG.mutateAsync(trimmed);
      onAdd({
        url: og.url,
        title: og.title,
        description: og.description,
        image: og.image,
        favicon: og.favicon,
        domain: og.domain,
      });
      setUrl("");
    } catch {
      // If OG fetch fails, still add with just the URL
      onAdd({ url: trimmed, domain: new URL(trimmed).hostname });
      setUrl("");
    }
  }, [url, onAdd, fetchOG]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Paste a URL and press Enter..."
          className="bg-bg-secondary h-9 text-sm"
          disabled={disabled || fetchOG.isPending}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleAdd}
          disabled={!url.trim() || disabled || fetchOG.isPending}
          className="h-9 shrink-0 gap-1.5 px-3"
        >
          {fetchOG.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Plus className="size-3.5" />
          )}
          Add
        </Button>
      </div>
      {error && (
        <p className="text-accent-red flex items-center gap-1.5 text-xs">
          <AlertCircle className="size-3" />
          {error}
        </p>
      )}
    </div>
  );
}
