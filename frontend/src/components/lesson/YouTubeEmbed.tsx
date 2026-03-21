/**
 * Responsive YouTube video embed iframe.
 */
import { getEmbedUrl } from "@/lib/youtube";

interface YouTubeEmbedProps {
  videoId: string;
  title?: string;
}

export function YouTubeEmbed({ videoId, title }: YouTubeEmbedProps) {
  return (
    <div className="relative w-full overflow-hidden rounded-lg bg-bg-tertiary" style={{ paddingBottom: "56.25%" }}>
      <iframe
        className="absolute inset-0 h-full w-full"
        src={getEmbedUrl(videoId)}
        title={title ?? "YouTube video"}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
}
