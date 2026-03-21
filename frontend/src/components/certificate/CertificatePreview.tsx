/**
 * Visual preview card for a course completion certificate.
 */
import { Award, Calendar, Layers, FileText, Hash } from "lucide-react";
import type { CertificateResponse } from "@/types/certificate";

interface CertificatePreviewProps {
  certificate: CertificateResponse;
}

export function CertificatePreview({ certificate }: CertificatePreviewProps) {
  const completedDate = new Date(certificate.completed_at).toLocaleDateString(
    "en-US",
    { year: "numeric", month: "long", day: "numeric" },
  );

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border-default bg-bg-secondary">
      {/* Decorative top gradient bar */}
      <div className="h-1.5 bg-gradient-to-r from-accent-purple via-accent-blue to-accent-green" />

      {/* Subtle radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.06),transparent_70%)] pointer-events-none" />

      <div className="relative flex flex-col items-center gap-6 px-6 py-10 sm:px-10 sm:py-12">
        {/* Award icon */}
        <div className="flex size-16 items-center justify-center rounded-full bg-accent-purple/10 ring-1 ring-accent-purple/20">
          <Award className="size-8 text-accent-purple" />
        </div>

        {/* Header */}
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-accent-purple">
            Certificate of Completion
          </p>
          <h2 className="mt-1 text-lg font-semibold text-text-primary sm:text-xl">
            Learner Verse
          </h2>
        </div>

        {/* Divider */}
        <div className="h-px w-16 bg-border-default" />

        {/* Content */}
        <div className="text-center">
          <p className="text-xs text-text-tertiary">This certifies that</p>
          <p className="mt-1 text-lg font-semibold text-text-primary sm:text-xl">
            {certificate.user_name}
          </p>
          <p className="mt-3 text-xs text-text-tertiary">
            has successfully completed
          </p>
          <p className="mt-1 text-base font-medium text-accent-blue sm:text-lg">
            {certificate.course_title}
          </p>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-text-secondary sm:gap-6">
          <div className="flex items-center gap-1.5">
            <Layers className="size-3.5 text-text-tertiary" />
            <span>
              {certificate.sections_count}{" "}
              {certificate.sections_count === 1 ? "section" : "sections"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <FileText className="size-3.5 text-text-tertiary" />
            <span>
              {certificate.lessons_count}{" "}
              {certificate.lessons_count === 1 ? "lesson" : "lessons"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="size-3.5 text-text-tertiary" />
            <span>{completedDate}</span>
          </div>
        </div>

        {/* Certificate ID */}
        <div className="flex items-center gap-1.5 rounded-md bg-bg-tertiary px-3 py-1.5">
          <Hash className="size-3 text-text-tertiary" />
          <span className="font-mono text-xs text-text-secondary">
            {certificate.certificate_uid}
          </span>
        </div>
      </div>
    </div>
  );
}
