/**
 * Input field for pasting a YouTube URL with automatic metadata fetching.
 */
import { useState } from "react";
import { Link2, Loader2, AlertCircle, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { extractVideoId } from "@/lib/youtube";
import { useFetchYouTubeMetadata } from "@/hooks/useSections";

interface YouTubeInputProps {
  currentUrl: string | null;
  currentTitle: string | null;
  currentThumbnail: string | null;
  currentChannel: string | null;
  currentDuration: string | null;
  onSave: (data: {
    youtube_url: string | null;
    youtube_title: string | null;
    youtube_thumbnail: string | null;
    youtube_channel: string | null;
    youtube_duration: string | null;
  }) => void;
}

export function YouTubeInput({
  currentUrl,
  currentTitle,
  currentThumbnail,
  currentChannel,
  currentDuration,
  onSave,
}: YouTubeInputProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fetchMeta = useFetchYouTubeMetadata();

  const hasVideo = !!currentUrl;

  const handleSubmit = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;

    const videoId = extractVideoId(trimmed);
    if (!videoId) {
      setError("Please enter a valid YouTube URL.");
      return;
    }

    setError(null);
    fetchMeta.mutate(trimmed, {
      onSuccess: (meta) => {
        onSave({
          youtube_url: trimmed,
          youtube_title: meta.title,
          youtube_thumbnail: meta.thumbnail_url,
          youtube_channel: meta.channel_name,
          youtube_duration: null, // oEmbed doesn't return duration
        });
        setUrl("");
      },
      onError: () => {
        // Even if metadata fetch fails, save the URL with basic info
        onSave({
          youtube_url: trimmed,
          youtube_title: null,
          youtube_thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          youtube_channel: null,
          youtube_duration: null,
        });
        setUrl("");
      },
    });
  };

  const handleRemove = () => {
    onSave({
      youtube_url: null,
      youtube_title: null,
      youtube_thumbnail: null,
      youtube_channel: null,
      youtube_duration: null,
    });
  };

  if (hasVideo) {
    return (
      <div className="border-border-default bg-bg-primary overflow-hidden rounded-lg border">
        {/* Preview Card */}
        <div className="flex gap-3 p-3">
          {/* Thumbnail */}
          <div className="bg-bg-tertiary relative shrink-0 overflow-hidden rounded-md">
            {currentThumbnail ? (
              <img
                src={currentThumbnail}
                alt={currentTitle ?? "Video thumbnail"}
                className="h-20 w-36 object-cover"
              />
            ) : (
              <div className="text-text-tertiary flex h-20 w-36 items-center justify-center">
                <Link2 className="size-6" />
              </div>
            )}
            {currentDuration && (
              <span className="absolute right-1 bottom-1 rounded bg-black/80 px-1 py-0.5 text-[10px] font-medium text-white">
                {currentDuration}
              </span>
            )}
          </div>

          {/* Info */}
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
            <p className="text-text-primary line-clamp-2 text-sm font-medium">
              {currentTitle ?? "Untitled Video"}
            </p>
            {currentChannel && <p className="text-text-secondary text-xs">{currentChannel}</p>}
            <a
              href={currentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-blue mt-0.5 inline-flex items-center gap-1 text-xs hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="size-3" />
              Open on YouTube
            </a>
          </div>

          {/* Remove */}
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handleRemove}
            className="text-text-tertiary hover:text-error shrink-0 self-start"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder="Paste YouTube URL..."
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSubmit();
            }
          }}
          onPaste={(e) => {
            // Auto-submit on paste after a brief delay
            setTimeout(() => {
              const pasted = e.clipboardData?.getData("text") ?? "";
              if (extractVideoId(pasted)) {
                handleSubmit();
              }
            }, 50);
          }}
          className="flex-1"
          disabled={fetchMeta.isPending}
        />
        <Button onClick={handleSubmit} disabled={!url.trim() || fetchMeta.isPending} size="default">
          {fetchMeta.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Link2 className="size-4" />
          )}
          {fetchMeta.isPending ? "Fetching..." : "Add Video"}
        </Button>
      </div>
      {error && (
        <p className="text-error flex items-center gap-1 text-xs">
          <AlertCircle className="size-3" />
          {error}
        </p>
      )}
    </div>
  );
}
