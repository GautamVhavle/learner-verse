import "@testing-library/jest-dom/vitest";

// JSDOM does not implement ResizeObserver
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof globalThis.ResizeObserver;
}

// JSDOM does not implement viewport intersection tracking. Components that
// only use it to pause off-screen animation can be treated as visible in unit
// tests; browser tests cover the real observer behavior.
if (typeof globalThis.IntersectionObserver === "undefined") {
  globalThis.IntersectionObserver = class IntersectionObserver {
    readonly root = null;
    readonly rootMargin = "0px";
    readonly thresholds = [0];

    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  } as unknown as typeof globalThis.IntersectionObserver;
}
