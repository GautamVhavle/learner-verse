import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router";

vi.mock("@/lib/auth", () => ({
  SINGLE_USER_MODE: true,
  SINGLE_USER: {
    id: "00000000-0000-0000-0000-000000000001",
    email: "local@learnerverse.dev",
    displayName: "Local User",
    avatarUrl: null,
  },
  CLERK_PUBLISHABLE_KEY: "",
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import ProtectedRoute from "@/components/ProtectedRoute";

describe("ProtectedRoute", () => {
  it("renders children in single-user mode", () => {
    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div data-testid="protected-content">Protected</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );
    expect(screen.getByTestId("protected-content")).toBeInTheDocument();
  });
});
