import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { fireEvent } from "@testing-library/react";

describe("useKeyboardShortcuts", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls action when matching key is pressed", () => {
    const action = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts([{ key: "f", action, description: "test" }]),
    );
    fireEvent.keyDown(document, { key: "f" });
    expect(action).toHaveBeenCalledOnce();
  });

  it("does not fire when key does not match", () => {
    const action = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts([{ key: "f", action, description: "test" }]),
    );
    fireEvent.keyDown(document, { key: "g" });
    expect(action).not.toHaveBeenCalled();
  });

  it("matches ctrlKey when specified", () => {
    const action = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts([
        { key: "k", ctrlKey: true, action, description: "test" },
      ]),
    );
    // Without ctrl - should not fire
    fireEvent.keyDown(document, { key: "k" });
    expect(action).not.toHaveBeenCalled();

    // With ctrl - should fire
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(action).toHaveBeenCalledOnce();
  });

  it("matches shiftKey when specified", () => {
    const action = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts([
        { key: "?", shiftKey: true, action, description: "test" },
      ]),
    );
    fireEvent.keyDown(document, { key: "?", shiftKey: true });
    expect(action).toHaveBeenCalledOnce();
  });

  it("blocks non-modifier shortcuts while typing in input", () => {
    const action = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts([{ key: "f", action, description: "test" }]),
    );

    const input = document.createElement("input");
    document.body.appendChild(input);
    fireEvent.keyDown(input, { key: "f" });
    expect(action).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it("blocks non-modifier shortcuts while typing in textarea", () => {
    const action = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts([{ key: "f", action, description: "test" }]),
    );

    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    fireEvent.keyDown(textarea, { key: "f" });
    expect(action).not.toHaveBeenCalled();
    document.body.removeChild(textarea);
  });

  it("allows Ctrl shortcuts while typing in input", () => {
    const action = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts([
        { key: "k", ctrlKey: true, action, description: "test" },
      ]),
    );

    const input = document.createElement("input");
    document.body.appendChild(input);
    fireEvent.keyDown(input, { key: "k", ctrlKey: true });
    expect(action).toHaveBeenCalledOnce();
    document.body.removeChild(input);
  });

  it("cleans up event listener on unmount", () => {
    const action = vi.fn();
    const { unmount } = renderHook(() =>
      useKeyboardShortcuts([{ key: "f", action, description: "test" }]),
    );
    unmount();
    fireEvent.keyDown(document, { key: "f" });
    expect(action).not.toHaveBeenCalled();
  });
});
