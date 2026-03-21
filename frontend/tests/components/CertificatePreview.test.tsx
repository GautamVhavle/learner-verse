import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { CertificatePreview } from "@/components/certificate/CertificatePreview";

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
  it("renders certificate details", () => {
    render(<CertificatePreview certificate={mockCert} />);
    expect(screen.getByText("Certificate of Completion")).toBeInTheDocument();
    expect(screen.getByText("Test Learner")).toBeInTheDocument();
    expect(screen.getByText("Advanced TypeScript")).toBeInTheDocument();
    expect(screen.getByText("LV-2026-ABCD1234")).toBeInTheDocument();
    expect(screen.getByText("4 sections")).toBeInTheDocument();
    expect(screen.getByText("20 lessons")).toBeInTheDocument();
  });

  it("renders singular section/lesson text when count is 1", () => {
    render(
      <CertificatePreview
        certificate={{ ...mockCert, sections_count: 1, lessons_count: 1 }}
      />,
    );
    expect(screen.getByText("1 section")).toBeInTheDocument();
    expect(screen.getByText("1 lesson")).toBeInTheDocument();
  });
});
