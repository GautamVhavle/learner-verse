/**
 * Page listing all earned certificates with share and download actions.
 */
import { Award, Loader2 } from "lucide-react";
import { useNavigate } from "react-router";
import { useCertificatesQuery } from "@/hooks/useCertificates";
import type { CertificateResponse } from "@/types/certificate";

export default function CertificatesPage() {
  const { data: certificates, isLoading } = useCertificatesQuery();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="text-text-tertiary size-6 animate-spin" />
      </div>
    );
  }

  const certs = certificates ?? [];

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-text-primary text-2xl font-bold tracking-tight">Certificates</h1>
        <p className="text-text-secondary mt-1 text-sm">Your earned certificates of completion.</p>
      </div>

      {certs.length === 0 ? (
        <div
          className="border-border-default flex min-h-[40vh] items-center justify-center rounded-xl border border-dashed py-16"
          data-testid="empty-state"
        >
          <div className="flex max-w-sm flex-col items-center text-center">
            <div className="bg-accent-purple/10 mb-4 flex size-14 items-center justify-center rounded-full">
              <Award className="text-accent-purple/50 size-7" />
            </div>
            <h3 className="text-text-primary text-base font-medium">No certificates yet</h3>
            <p className="text-text-secondary mt-1 text-sm">
              Complete a course to earn your first certificate!
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {certs.map((cert) => (
            <CertificateCard key={cert.id} certificate={cert} onClick={() => navigate(`/certificates/share/${cert.certificate_uid}`)} />
          ))}
        </div>
      )}
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
  const completedDate = new Date(certificate.completed_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <button
      onClick={onClick}
      className="group border-border-default bg-bg-secondary hover:border-accent-purple/30 flex flex-col gap-3 rounded-xl border p-5 text-left transition-all hover:shadow-[0_0_20px_rgba(168,85,247,0.05)]"
    >
      {/* Top row: icon + badge */}
      <div className="flex items-start justify-between">
        <div className="bg-accent-purple/10 group-hover:bg-accent-purple/15 flex size-10 items-center justify-center rounded-lg transition-colors">
          <Award className="text-accent-purple size-5" />
        </div>
        <span className="bg-bg-tertiary text-text-tertiary rounded-md px-2 py-0.5 font-mono text-[10px]">
          {certificate.certificate_uid}
        </span>
      </div>

      {/* Course title */}
      <div>
        <h3 className="text-text-primary line-clamp-2 text-sm font-medium">
          {certificate.course_title}
        </h3>
        <p className="text-text-secondary mt-1 text-xs">Earned by {certificate.user_name}</p>
      </div>

      {/* Footer stats */}
      <div className="text-text-tertiary flex items-center gap-3 text-[11px]">
        <span>
          {certificate.sections_count} {certificate.sections_count === 1 ? "section" : "sections"}
        </span>
        <span>&middot;</span>
        <span>
          {certificate.lessons_count} {certificate.lessons_count === 1 ? "lesson" : "lessons"}
        </span>
        <span>&middot;</span>
        <span>{completedDate}</span>
      </div>

      {/* View hint */}
      <div className="text-accent-purple text-xs font-medium opacity-0 transition-opacity group-hover:opacity-100">
        Click to view certificate &rarr;
      </div>
    </button>
  );
}
