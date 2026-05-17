import type { ReactNode } from "react";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

import { api } from "@/lib/api";
import { useImportPlaylistMutation } from "@/hooks/useLessons";

function createWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe("useImportPlaylistMutation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts a background import, polls until done, and refreshes sections", async () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");
    const postMock = vi.mocked(api.post);
    const getMock = vi.mocked(api.get);

    postMock.mockResolvedValue({ task_id: "task-123" });
    getMock
      .mockResolvedValueOnce({
        status: "running",
        error: null,
        status_message: "Fetching playlist from YouTube...",
        playlist_title: null,
        imported_count: null,
      })
      .mockResolvedValueOnce({
        status: "done",
        error: null,
        status_message: "Import complete.",
        playlist_title: "Big Playlist",
        imported_count: 3,
      });

    const { result } = renderHook(() => useImportPlaylistMutation("course-1"), {
      wrapper: createWrapper(qc),
    });

    let promise!: Promise<unknown>;
    await act(async () => {
      promise = result.current.mutateAsync({
        sectionId: "section-1",
        playlistUrl: "https://www.youtube.com/playlist?list=test",
      });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });

    await expect(promise).resolves.toMatchObject({
      status: "done",
      playlist_title: "Big Playlist",
      imported_count: 3,
    });
    expect(postMock).toHaveBeenCalledWith("/sections/section-1/lessons/import-playlist", {
      playlist_url: "https://www.youtube.com/playlist?list=test",
    });
    expect(getMock).toHaveBeenCalledTimes(2);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["sections", "course-1"] });
  });

  it("rejects when the background import fails", async () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const postMock = vi.mocked(api.post);
    const getMock = vi.mocked(api.get);
    const onError = vi.fn();

    postMock.mockResolvedValue({ task_id: "task-456" });
    getMock.mockResolvedValue({
      status: "failed",
      error: "Playlist is private.",
      status_message: "Import failed.",
      playlist_title: null,
      imported_count: null,
    });

    const { result } = renderHook(() => useImportPlaylistMutation("course-2"), {
      wrapper: createWrapper(qc),
    });

    await act(async () => {
      result.current.mutate(
        {
          sectionId: "section-9",
          playlistUrl: "https://www.youtube.com/playlist?list=private",
        },
        { onError },
      );
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(onError).toHaveBeenCalledTimes(1);
    expect((onError.mock.calls[0]?.[0] as Error).message).toBe("Playlist is private.");
  });
});
