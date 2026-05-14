/**
 * Certificate preview - renders the actual PDF inline via BlobProvider
 * so it's a true 1:1 match with the downloaded file.
 */
import { BlobProvider } from "@react-pdf/renderer";
import { Loader2 } from "lucide-react";
import { CertificatePDF } from "@/components/certificate/CertificateDownload";
import type { CertificateResponse } from "@/types/certificate";

interface CertificatePreviewProps {
  certificate: CertificateResponse;
  compact?: boolean;
}

export function CertificatePreview({ certificate, compact }: CertificatePreviewProps) {
  return (
    <div data-testid="certificate-preview">
      {/* A4 landscape aspect ratio = 297 / 210 */}
      <div
        className={`overflow-hidden rounded-2xl ${compact ? "" : "shadow-2xl"}`}
        style={{
          aspectRatio: "297 / 210",
          background: "#f9fafb",
          border: "1px solid #e5e7eb",
        }}
      >
        <BlobProvider document={<CertificatePDF certificate={certificate} />}>
          {({ url, loading }) =>
            loading || !url ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="size-5 animate-spin" style={{ color: "#6366f1" }} />
              </div>
            ) : (
              <div className="relative h-full w-full">
                <iframe
                  src={`${url}#toolbar=0&navpanes=0&scrollbar=0&view=Fit`}
                  title="Certificate Preview"
                  className="h-full w-full"
                  style={{ border: "none" }}
                  sandbox="allow-same-origin"
                />
                {/* Block all user interaction with the PDF */}
                <div className="absolute inset-0" />
              </div>
            )
          }
        </BlobProvider>
      </div>
    </div>
  );
}
