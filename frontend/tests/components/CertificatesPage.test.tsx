import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

const mockCerts = [
  {
    id: "cert-1",
    user_id: "u1",
    course_id: "c1",
    certificate_uid: "LV-2026-ABCD1234",
    user_name: "Test User",
    course_title: "React Fundamentals",
    sections_count: 3,
    lessons_count: 12,
    completed_at: "2026-03-15T10:00:00Z",
  },
];

let returnData: typeof mockCerts | [] = mockCerts;

vi.mock("@/hooks/useCertificates", () => ({
  useCertificatesQuery: () => ({
    data: returnData,
    isLoading: false,
  }),
}));

vi.mock("react-router", () => ({
  useNavigate: () => vi.fn(),
}));

import CertificatesPage from "@/pages/CertificatesPage";

describe("CertificatesPage", () => {
  it("renders certificate cards", () => {
    returnData = mockCerts;
    render(<CertificatesPage />);
    expect(screen.getByText("Certificates")).toBeInTheDocument();
    expect(screen.getByText("React Fundamentals")).toBeInTheDocument();
    expect(screen.getByText("LV-2026-ABCD1234")).toBeInTheDocument();
  });

  it("shows empty state when no certificates", () => {
    returnData = [];
    render(<CertificatesPage />);
    expect(screen.getByText("No certificates yet")).toBeInTheDocument();
  });
});
