import { render } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { YouTubeEmbed } from "@/components/lesson/YouTubeEmbed";

// Mock YouTube API
const mockYTPlayer = {
  setPlaybackRate: vi.fn(),
  getAvailablePlaybackRates: vi.fn(() => [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]),
  destroy: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();

  // Set up YouTube API mock
  window.YT = {
    Player: vi.fn((elementId, options) => {
      // Call onReady callback if provided
      if (options.events?.onReady) {
        setTimeout(() => {
          options.events.onReady({ target: mockYTPlayer });
        }, 0);
      }
      return mockYTPlayer;
    }),
    PlayerState: {
      UNSTARTED: -1,
      ENDED: 0,
      PLAYING: 1,
      PAUSED: 2,
      BUFFERING: 3,
      CUED: 5,
    },
    loaded: 1,
  } as any;

  window.onYouTubeIframeAPIReady = vi.fn();
});

describe("YouTubeEmbed", () => {
  it("renders container with correct aspect ratio", () => {
    const { container } = render(<YouTubeEmbed videoId="dQw4w9WgXcQ" />);
    const wrapper = container.querySelector(".relative.w-full");
    expect(wrapper).toBeInTheDocument();
    expect(wrapper).toHaveStyle({ paddingBottom: "56.25%" });
  });

  it("creates YouTube player with correct videoId", async () => {
    render(<YouTubeEmbed videoId="dQw4w9WgXcQ" />);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(window.YT.Player).toHaveBeenCalledWith(
      expect.stringContaining("youtube-player-dQw4w9WgXcQ"),
      expect.objectContaining({
        videoId: "dQw4w9WgXcQ",
      })
    );
  });

  it("sets playback speed when player is ready", async () => {
    render(<YouTubeEmbed videoId="dQw4w9WgXcQ" playbackSpeed={1.5} />);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockYTPlayer.setPlaybackRate).toHaveBeenCalledWith(1.5);
  });

  it("uses default playback speed of 1 if not provided", async () => {
    render(<YouTubeEmbed videoId="dQw4w9WgXcQ" />);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockYTPlayer.setPlaybackRate).toHaveBeenCalledWith(1);
  });

  it("updates playback speed when prop changes", async () => {
    const { rerender } = render(<YouTubeEmbed videoId="dQw4w9WgXcQ" playbackSpeed={1} />);

    await new Promise((resolve) => setTimeout(resolve, 10));

    rerender(<YouTubeEmbed videoId="dQw4w9WgXcQ" playbackSpeed={2} />);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockYTPlayer.setPlaybackRate).toHaveBeenCalledWith(2);
  });

  it("uses custom title", () => {
    const { container } = render(
      <YouTubeEmbed videoId="dQw4w9WgXcQ" title="My Video" />
    );
    const playerDiv = container.querySelector("[title='My Video']");
    expect(playerDiv).toBeInTheDocument();
  });

  it("cleans up player on unmount", async () => {
    const { unmount } = render(<YouTubeEmbed videoId="dQw4w9WgXcQ" />);

    await new Promise((resolve) => setTimeout(resolve, 10));

    unmount();

    expect(mockYTPlayer.destroy).toHaveBeenCalled();
  });
});
