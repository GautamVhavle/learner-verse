/**
 * Public shareable certificate page accessed via unique certificate UID.
 */
import { useParams, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ArrowLeft, Share2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CertificatePreview } from "@/components/certificate/CertificatePreview";
import { CertificateDownload } from "@/components/certificate/CertificateDownload";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { api } from "@/lib/api";
import type { CertificateResponse } from "@/types/certificate";

export default function CertificateSharePage() {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const { copied, copyToClipboard } = useCopyToClipboard();

  const { data: certificate, isLoading, error } = useQuery<CertificateResponse>({
    queryKey: ["certificate-share", uid],
    queryFn: async () => {
      const res = await api.get(`/certificates/share/${uid}`);
      return res.data;
    },
    enabled: !!uid,
  });

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/certificates/share/${uid}`
    : "";

  const handleCopy = () => copyToClipboard(shareUrl);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-text-tertiary" />
      </div>
    );
  }

  if (error || !certificate) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex max-w-md flex-col items-center text-center">
          <p className="text-5xl font-bold text-text-tertiary">404</p>
          <h2 className="mt-3 text-lg font-semibold text-text-primary">
            Certificate not found
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            This certificate link may be invalid or has been removed.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-6"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="mr-1.5 size-3.5" />
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6" data-testid="certificate-share-page">
      <CertificatePreview certificate={certificate} />

      <div className="flex flex-wrap items-center justify-center gap-3">
        <CertificateDownload certificate={certificate} />
        <Button variant="outline" size="sm" onClick={handleCopy}>
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
                title: `${certificate.user_name}'s Certificate`,
                text: `${certificate.user_name} completed "${certificate.course_title}" on Learner Verse`,
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
  );
}
