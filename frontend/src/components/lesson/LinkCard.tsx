/**
 * Card displaying a reference link with favicon, title, and optional remove button.
 */
import { ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { safeExternalUrl, safeDomain } from "@/lib/safeUrl";
import type { ReferenceLink } from "@/types/section";

interface LinkCardProps {
  link: ReferenceLink;
  onRemove?: () => void;
  readonly?: boolean;
}

export function LinkCard({ link, onRemove, readonly }: LinkCardProps) {
  return (
    <div className="group border-border-default bg-bg-secondary hover:border-border-hover relative flex gap-3 rounded-lg border p-3 transition-colors">
      {/* OG Image */}
      {link.image && (
        <div className="hidden shrink-0 sm:block">
          <img
            src={link.image}
            alt=""
            className="h-16 w-24 rounded-md object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      )}

      {/* Content */}
      <div className="min-w-0 flex-1">
        <a
          href={safeExternalUrl(link.url)}
          target="_blank"
          rel="noopener noreferrer"
          className="group/link flex items-start gap-1.5"
        >
          <span className="text-text-primary group-hover/link:text-accent-blue line-clamp-1 text-sm font-medium">
            {link.title || link.url}
          </span>
          <ExternalLink className="text-text-tertiary mt-0.5 size-3 shrink-0" />
        </a>

        {link.description && (
          <p className="text-text-secondary mt-0.5 line-clamp-2 text-xs">{link.description}</p>
        )}

        {/* Domain + Favicon */}
        <div className="mt-1.5 flex items-center gap-1.5">
          {link.favicon && (
            <img
              src={link.favicon}
              alt=""
              className="size-3.5 rounded-sm"
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          <span className="text-text-tertiary text-xs">
            {link.domain || safeDomain(link.url)}
          </span>
        </div>
      </div>

      {/* Remove button */}
      {!readonly && onRemove && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="border-border-default bg-bg-tertiary absolute -top-1.5 -right-1.5 size-6 rounded-full border opacity-0 transition-opacity group-hover:opacity-100"
        >
          <X className="size-3" />
        </Button>
      )}
    </div>
  );
}
