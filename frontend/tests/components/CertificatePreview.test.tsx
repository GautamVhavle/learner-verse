import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { CertificatePreview } from "@/components/certificate/CertificatePreview";

// BlobProvider can't run in jsdom - mock it to render an iframe with a fake url
vi.mock("@react-pdf/renderer", () => ({
  BlobProvider: ({
    children,
  }: {
    children: (props: { url: string | null; loading: boolean }) => React.ReactNode;
  }) => children({ url: "blob:fake", loading: false }),
}));

// CertificatePDF uses react-pdf internals (Document, Page, etc.) which also fail in jsdom
vi.mock("@/components/certificate/CertificateDownload", () => ({
  CertificatePDF: () => null,
}));

const mockCert = {
  id: "cert-1",
  user_id: "u1",
  course_id: "c1",
  certificate_uid: "LV-2026-ABCD1234",
  user_name: "Test Learner",
  course_title: "Advanced TypeScript",
  sections_count: 4,
  lessons_count: 20,
  completed_at: "2026-03-15T10:00:00Z",
};

describe("CertificatePreview", () => {
  it("renders the preview container and iframe", () => {
    render(<CertificatePreview certificate={mockCert} />);
    expect(screen.getByTestId("certificate-preview")).toBeInTheDocument();
    expect(screen.getAllByTitle("Certificate Preview").length).toBeGreaterThanOrEqual(1);
  });

  it("renders with compact prop", () => {
    render(<CertificatePreview certificate={mockCert} compact />);
    expect(screen.getByTestId("certificate-preview")).toBeInTheDocument();
  });
});
