/**
 * Responsive YouTube video embed iframe with playback speed control.
 *
 * Uses YouTube IFrame Player API to enable:
 * - Programmatic playback speed control
 * - Applied from user settings
 * - Persists across lesson navigation
 */
import { useEffect, useId, useRef } from "react";

interface YTPlayerOptions {
  videoId: string;
  events?: {
    onReady?: (event: { target: YTPlayer }) => void;
    onStateChange?: (event: { data: number }) => void;
  };
  playerVars?: {
    autoplay?: number;
    controls?: number;
    modestbranding?: number;
    rel?: number;
  };
}

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  destroy(): void;
  seekTo(seconds: number): void;
  setVolume(volume: number): void;
  mute(): void;
  setPlaybackRate(rate: number): void;
  getPlaybackRate(): number;
  getAvailablePlaybackRates(): number[];
}

declare global {
  interface Window {
    YT: {
      Player: new (element: string | HTMLElement, options: YTPlayerOptions) => YTPlayer;
      PlayerState: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
      loaded: number;
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubeEmbedProps {
  videoId: string;
  title?: string;
  playbackSpeed?: number;
  onEnded?: () => void;
}

let apiReadyPromise: Promise<void> | null = null;

/** Load the global YouTube API once without replacing another consumer's callback. */
function loadYouTubeAPI(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (apiReadyPromise) return apiReadyPromise;

  apiReadyPromise = new Promise<void>((resolve, reject) => {
    const previousReadyHandler = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReadyHandler?.();
      resolve();
    };

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]',
    );
    if (existingScript) return;

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.defer = true;
    script.addEventListener(
      "error",
      () => {
        apiReadyPromise = null;
        reject(new Error("Failed to load the YouTube player API"));
      },
      { once: true },
    );
    document.head.appendChild(script);
  });

  return apiReadyPromise;
}

export function YouTubeEmbed({ videoId, title, playbackSpeed = 1, onEnded }: YouTubeEmbedProps) {
  const instanceId = useId().replaceAll(":", "");
  const containerId = `youtube-player-${videoId}-${instanceId}`;
  const playerRef = useRef<YTPlayer | null>(null);
  const onEndedRef = useRef(onEnded);
  const playbackSpeedRef = useRef(playbackSpeed);

  // Keep ref in sync so the YT callback always sees the latest handler
  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  useEffect(() => {
    playbackSpeedRef.current = playbackSpeed;
  }, [playbackSpeed]);

  // Initialize player
  useEffect(() => {
    let cancelled = false;

    async function initPlayer() {
      await loadYouTubeAPI();

      if (cancelled || !window.YT || playerRef.current) return;

      try {
        playerRef.current = new window.YT.Player(containerId, {
          videoId,
          events: {
            onReady: (event) => {
              // Set playback speed after player is ready
              const player = event.target;
              const availableSpeeds = player.getAvailablePlaybackRates();
              const currentSpeed = playbackSpeedRef.current;
              const speedToSet = availableSpeeds.includes(currentSpeed) ? currentSpeed : 1;
              player.setPlaybackRate(speedToSet);
            },
            onStateChange: (event) => {
              if (event.data === window.YT.PlayerState.ENDED) {
                onEndedRef.current?.();
              }
            },
          },
          playerVars: {
            controls: 1,
            modestbranding: 1,
            rel: 0,
          },
        });
      } catch (error) {
        console.warn("Failed to initialize YouTube player:", error);
      }
    }

    initPlayer();

    return () => {
      cancelled = true;
      // Clean up player on unmount (but keep API loaded for next video)
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (error) {
          console.warn("Failed to destroy YouTube player:", error);
        }
        playerRef.current = null;
      }
    };
  }, [videoId, containerId]);

  // Update playback speed when it changes
  useEffect(() => {
    if (!playerRef.current) return;

    try {
      const availableSpeeds = playerRef.current.getAvailablePlaybackRates();
      const speedToSet = availableSpeeds.includes(playbackSpeed) ? playbackSpeed : 1;
      playerRef.current.setPlaybackRate(speedToSet);
    } catch (error) {
      console.warn("Failed to set playback speed:", error);
    }
  }, [playbackSpeed]);

  return (
    <div
      className="bg-bg-tertiary relative w-full overflow-hidden rounded-lg"
      style={{ paddingBottom: "56.25%" }}
    >
      <div
        id={containerId}
        className="absolute inset-0 h-full w-full"
        title={title ?? "YouTube video"}
      />
    </div>
  );
}
