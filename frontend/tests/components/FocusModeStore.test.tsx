import { describe, it, expect, beforeEach } from "vitest";
import { useFocusModeStore } from "@/stores/focusModeStore";

describe("focusModeStore", () => {
  beforeEach(() => {
    useFocusModeStore.setState({ focusMode: false });
  });

  it("starts with focusMode false", () => {
    expect(useFocusModeStore.getState().focusMode).toBe(false);
  });

  it("toggleFocusMode flips to true", () => {
    useFocusModeStore.getState().toggleFocusMode();
    expect(useFocusModeStore.getState().focusMode).toBe(true);
  });

  it("toggleFocusMode flips back to false", () => {
    useFocusModeStore.getState().toggleFocusMode();
    useFocusModeStore.getState().toggleFocusMode();
    expect(useFocusModeStore.getState().focusMode).toBe(false);
  });

  it("setFocusMode sets to true", () => {
    useFocusModeStore.getState().setFocusMode(true);
    expect(useFocusModeStore.getState().focusMode).toBe(true);
  });

  it("setFocusMode sets to false", () => {
    useFocusModeStore.getState().setFocusMode(true);
    useFocusModeStore.getState().setFocusMode(false);
    expect(useFocusModeStore.getState().focusMode).toBe(false);
  });
});
