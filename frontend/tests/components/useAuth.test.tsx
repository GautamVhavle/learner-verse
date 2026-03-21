import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Mock auth module to enable single-user mode
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

// Must import after mock
import { useAuth } from "@/hooks/useAuth";

function TestComponent() {
  const { user, isLoaded, isSignedIn } = useAuth();
  return (
    <div>
      <span data-testid="loaded">{String(isLoaded)}</span>
      <span data-testid="signed-in">{String(isSignedIn)}</span>
      <span data-testid="email">{user?.email}</span>
      <span data-testid="name">{user?.displayName}</span>
    </div>
  );
}

describe("useAuth", () => {
  it("returns single-user in single-user mode", () => {
    render(<TestComponent />);
    expect(screen.getByTestId("loaded")).toHaveTextContent("true");
    expect(screen.getByTestId("signed-in")).toHaveTextContent("true");
    expect(screen.getByTestId("email")).toHaveTextContent(
      "local@learnerverse.dev",
    );
    expect(screen.getByTestId("name")).toHaveTextContent("Local User");
  });
});
