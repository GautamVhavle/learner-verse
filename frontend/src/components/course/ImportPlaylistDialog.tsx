/**
 * Dialog for importing a YouTube playlist as video lessons.
 *
 * Accepts a playlist URL, validates it, calls the backend to extract
 * all videos, and creates them as lessons in the target section.
 */
import { useState } from "react";
import { ListVideo, Loader2, LinkIcon } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useImportPlaylistMutation } from "@/hooks/useLessons";

const PLAYLIST_URL_RE = /^https?:\/\/(www\.)?youtube\.com\/playlist\?.*list=[A-Za-z0-9_-]+/;

interface ImportPlaylistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionId: string;
  courseId: string;
}

export function ImportPlaylistDialog({
  open,
  onOpenChange,
  sectionId,
  courseId,
}: ImportPlaylistDialogProps) {
  const [url, setUrl] = useState("");
  const importMutation = useImportPlaylistMutation(courseId);

  const isValidUrl = PLAYLIST_URL_RE.test(url.trim());

  const handleImport = () => {
    if (!isValidUrl) return;

    importMutation.mutate(
      { sectionId, playlistUrl: url.trim() },
      {
        onSuccess: (result) => {
          const importedCount = result.imported_count ?? 0;
          const playlistTitle = result.playlist_title ?? "playlist";
          toast.success(`Imported ${importedCount} videos from "${playlistTitle}"`);
          setUrl("");
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : "Failed to import playlist");
        },
      },
    );
  };

  const handleOpenChange = (next: boolean) => {
    if (!importMutation.isPending) {
      setUrl("");
      onOpenChange(next);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="bg-accent-purple/10 text-accent-purple flex size-9 items-center justify-center rounded-lg">
              <ListVideo className="size-5" />
            </div>
            <div>
              <DialogTitle>Import YouTube Playlist</DialogTitle>
              <DialogDescription>
                Paste a playlist link to import all videos as lessons.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2">
          <div className="relative">
            <LinkIcon className="text-text-tertiary absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              placeholder="https://www.youtube.com/playlist?list=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isValidUrl) handleImport();
              }}
              disabled={importMutation.isPending}
              className="pl-9"
              autoFocus
            />
          </div>

          {url.trim() && !isValidUrl && (
            <p className="text-xs text-red-500">Please enter a valid YouTube playlist URL</p>
          )}

          {importMutation.isPending && (
            <div className="border-border-default bg-bg-secondary flex items-center gap-2 rounded-lg border px-3 py-2.5">
              <Loader2 className="text-accent-purple size-4 animate-spin" />
              <div className="space-y-0.5">
                <span className="text-text-secondary block text-sm">
                  Importing playlist in the background...
                </span>
                <span className="text-text-tertiary block text-xs">
                  Large playlists can take a while. This dialog will stay open until the import
                  finishes.
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={importMutation.isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!isValidUrl || importMutation.isPending}>
            {importMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <ListVideo className="size-4" />
                Import Playlist
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
