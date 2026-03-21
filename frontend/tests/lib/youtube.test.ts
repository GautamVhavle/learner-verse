import { describe, it, expect } from "vitest";
import { extractVideoId, isYouTubeUrl, getEmbedUrl, getThumbnailUrl } from "@/lib/youtube";

describe("extractVideoId", () => {
  it("extracts from standard watch URL", () => {
    expect(extractVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts from short URL", () => {
    expect(extractVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts from embed URL", () => {
    expect(extractVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts from shorts URL", () => {
    expect(extractVideoId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts with extra params", () => {
    expect(extractVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120")).toBe("dQw4w9WgXcQ");
  });

  it("returns null for invalid URL", () => {
    expect(extractVideoId("https://example.com")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(extractVideoId("")).toBeNull();
  });
});

describe("isYouTubeUrl", () => {
  it("returns true for valid", () => {
    expect(isYouTubeUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(true);
  });

  it("returns false for invalid", () => {
    expect(isYouTubeUrl("https://example.com")).toBe(false);
  });
});

describe("getEmbedUrl", () => {
  it("builds correct embed URL", () => {
    expect(getEmbedUrl("dQw4w9WgXcQ")).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1");
  });
});

describe("getThumbnailUrl", () => {
  it("builds hqdefault by default", () => {
    expect(getThumbnailUrl("dQw4w9WgXcQ")).toBe("https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
  });

  it("builds maxresdefault when specified", () => {
    expect(getThumbnailUrl("dQw4w9WgXcQ", "maxresdefault")).toBe("https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg");
  });
});
