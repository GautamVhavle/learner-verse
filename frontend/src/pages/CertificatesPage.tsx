/**
 * Page listing all earned certificates with share and download actions.
 */
import { useState } from "react";
import { Award, Loader2, Copy, Check, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { CertificatePreview } from "@/components/certificate/CertificatePreview";
import { CertificateDownload } from "@/components/certificate/CertificateDownload";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { useCertificatesQuery } from "@/hooks/useCertificates";
import type { CertificateResponse } from "@/types/certificate";

export default function CertificatesPage() {
  const { data: certificates, isLoading } = useCertificatesQuery();
  const [selected, setSelected] = useState<CertificateResponse | null>(null);
  const { copied, copyToClipboard } = useCopyToClipboard();

  const shareUrl = selected
    ? `${window.location.origin}/certificates/share/${selected.certificate_uid}`
    : "";

  const handleCopy = () => copyToClipboard(shareUrl);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-text-tertiary" />
      </div>
    );
  }

  const certs = certificates ?? [];

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          Certificates
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Your earned certificates of completion.
        </p>
      </div>

      {certs.length === 0 ? (
        <div
          className="flex min-h-[40vh] items-center justify-center rounded-xl border border-dashed border-border-default py-16"
          data-testid="empty-state"
        >
          <div className="flex max-w-sm flex-col items-center text-center">
            <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-accent-purple/10">
              <Award className="size-7 text-accent-purple/50" />
            </div>
            <h3 className="text-base font-medium text-text-primary">
              No certificates yet
            </h3>
            <p className="mt-1 text-sm text-text-secondary">
              Complete a course to earn your first certificate!
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {certs.map((cert) => (
            <CertificateCard
              key={cert.id}
              certificate={cert}
              onClick={() => setSelected(cert)}
            />
          ))}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) { setSelected(null); } }}>
        <DialogContent className="sm:max-w-lg">
          {selected && (
            <div className="space-y-4">
              <CertificatePreview certificate={selected} />
              <div className="flex flex-wrap justify-center gap-2">
                <CertificateDownload certificate={selected} />
                <Button variant="outline" size="sm" onClick={handleCopy} data-testid="copy-share-link">
                  {copied ? (
                    <>
                      <Check className="mr-1.5 size-3.5 text-accent-green" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1.5 size-3.5" />
                      Copy Link
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: `${selected.user_name}'s Certificate`,
                        text: `${selected.user_name} completed "${selected.course_title}" on Learner Verse`,
                        url: shareUrl,
                      });
                    }
                  }}
                >
                  <Share2 className="mr-1.5 size-3.5" />
                  Share
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CertificateCard({
  certificate,
  onClick,
}: {
  certificate: CertificateResponse;
  onClick: () => void;
}) {
  const completedDate = new Date(certificate.completed_at).toLocaleDateString(
    "en-US",
    { year: "numeric", month: "short", day: "numeric" },
  );

  return (
    <button
      onClick={onClick}
      className="group flex flex-col gap-3 rounded-xl border border-border-default bg-bg-secondary p-5 text-left transition-all hover:border-accent-purple/30 hover:shadow-[0_0_20px_rgba(168,85,247,0.05)]"
    >
      {/* Top row: icon + badge */}
      <div className="flex items-start justify-between">
        <div className="flex size-10 items-center justify-center rounded-lg bg-accent-purple/10 transition-colors group-hover:bg-accent-purple/15">
          <Award className="size-5 text-accent-purple" />
        </div>
        <span className="rounded-md bg-bg-tertiary px-2 py-0.5 font-mono text-[10px] text-text-tertiary">
          {certificate.certificate_uid}
        </span>
      </div>

      {/* Course title */}
      <div>
        <h3 className="line-clamp-2 text-sm font-medium text-text-primary">
          {certificate.course_title}
        </h3>
        <p className="mt-1 text-xs text-text-secondary">
          Earned by {certificate.user_name}
        </p>
      </div>

      {/* Footer stats */}
      <div className="flex items-center gap-3 text-[11px] text-text-tertiary">
        <span>
          {certificate.sections_count}{" "}
          {certificate.sections_count === 1 ? "section" : "sections"}
        </span>
        <span>&middot;</span>
        <span>
          {certificate.lessons_count}{" "}
          {certificate.lessons_count === 1 ? "lesson" : "lessons"}
        </span>
        <span>&middot;</span>
        <span>{completedDate}</span>
      </div>

      {/* View hint */}
      <div className="text-xs font-medium text-accent-purple opacity-0 transition-opacity group-hover:opacity-100">
        Click to view certificate &rarr;
      </div>
    </button>
  );
}
