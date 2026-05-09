import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MemoryRouter } from "react-router";
import NotFoundPage from "@/pages/NotFoundPage";

describe("NotFoundPage", () => {
  it("renders 404 heading and message", () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    );
    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByText("Page not found")).toBeInTheDocument();
    expect(screen.getByTestId("not-found-page")).toBeInTheDocument();
  });

  it("shows Go back and Dashboard buttons", () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: /go back/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /dashboard/i })).toBeInTheDocument();
  });
});
