import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { YouTubeEmbed } from "@/components/lesson/YouTubeEmbed";

describe("YouTubeEmbed", () => {
  it("renders iframe with correct src", () => {
    render(<YouTubeEmbed videoId="dQw4w9WgXcQ" />);
    const iframe = screen.getByTitle("YouTube video");
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute(
      "src",
      "https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1"
    );
  });

  it("uses custom title", () => {
    render(<YouTubeEmbed videoId="dQw4w9WgXcQ" title="My Video" />);
    expect(screen.getByTitle("My Video")).toBeInTheDocument();
  });

  it("has allowFullScreen", () => {
    render(<YouTubeEmbed videoId="abc12345678" />);
    const iframe = screen.getByTitle("YouTube video");
    expect(iframe).toHaveAttribute("allowfullscreen");
  });

  it("has correct allow attributes", () => {
    render(<YouTubeEmbed videoId="abc12345678" />);
    const iframe = screen.getByTitle("YouTube video");
    expect(iframe.getAttribute("allow")).toContain("autoplay");
    expect(iframe.getAttribute("allow")).toContain("encrypted-media");
  });
});
