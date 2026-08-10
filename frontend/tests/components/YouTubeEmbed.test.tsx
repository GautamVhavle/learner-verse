import { render } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock YouTube API
const mockYTPlayer = {
  setPlaybackRate: vi.fn(),
  getAvailablePlaybackRates: vi.fn(() => [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]),
  destroy: vi.fn(),
};

// Set up the YT global before importing the component so the loader can
// immediately reuse an API that is already available on the page.
window.YT = {
  // Must use `function` (not arrow) because the component calls `new YT.Player(...)`
  Player: vi.fn(function (
    this: typeof mockYTPlayer,
    _el: string,
    opts: { events?: { onReady?: (e: { target: typeof mockYTPlayer }) => void } },
  ) {
    Object.assign(this, mockYTPlayer);
    if (opts.events?.onReady) {
      Promise.resolve().then(() => opts.events!.onReady!({ target: this }));
    }
  }),
  PlayerState: { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 },
  loaded: 1,
} as unknown as typeof window.YT;

// Import AFTER setting window.YT so the module sees it.
import { YouTubeEmbed } from "@/components/lesson/YouTubeEmbed";

beforeEach(() => {
  // Reset call counts but keep implementations
  mockYTPlayer.setPlaybackRate.mockClear();
  mockYTPlayer.getAvailablePlaybackRates
    .mockClear()
    .mockReturnValue([0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]);
  mockYTPlayer.destroy.mockClear();

  // Recreate the Player mock so each test gets fresh onReady handling
  (window.YT as unknown as { Player: unknown }).Player = vi.fn(function (
    this: typeof mockYTPlayer,
    _el: string,
    opts: { events?: { onReady?: (e: { target: typeof mockYTPlayer }) => void } },
  ) {
    Object.assign(this, mockYTPlayer);
    if (opts.events?.onReady) {
      Promise.resolve().then(() => opts.events!.onReady!({ target: this }));
    }
  });
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
      }),
    );
  });

  it("uses a unique player container for duplicate video embeds", async () => {
    render(
      <>
        <YouTubeEmbed videoId="dQw4w9WgXcQ" />
        <YouTubeEmbed videoId="dQw4w9WgXcQ" />
      </>,
    );

    await new Promise((resolve) => setTimeout(resolve, 10));

    const containerIds = vi.mocked(window.YT.Player).mock.calls.map(([containerId]) => containerId);
    expect(new Set(containerIds).size).toBe(2);
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
    const { container } = render(<YouTubeEmbed videoId="dQw4w9WgXcQ" title="My Video" />);
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
