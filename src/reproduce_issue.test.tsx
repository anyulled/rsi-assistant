import { render, cleanup } from "@testing-library/react";
import { describe, it, expect, mock, afterEach } from "bun:test";
import App from "./App";
import { mockListen, mockInvoke } from "./setupTests";

describe("App Listener Leak", () => {
  afterEach(() => {
    cleanup();
  });

  it("should cleanup listener even if unmount happens before listener is established", async () => {
    // Mock get_timer_state to avoid errors during rendering
    mockInvoke.mockImplementation((cmd: string) => {
        if (cmd === "get_timer_state") {
            return Promise.resolve({
                mode: "Normal",
                microActive: 0,
                microTarget: 100,
                microIsOverdue: false,
                restActive: 0,
                restTarget: 1000,
                restIsOverdue: false,
                dailyUsage: 0,
                dailyLimit: 10000,
                currentIdle: 0,
                breakType: null,
                breakDuration: 0,
                breakElapsed: 0,
            });
        }
        if (cmd === "get_settings") return Promise.resolve({});
        return Promise.resolve(null);
    });

    let resolveListen: (unlisten: () => void) => void;
    const listenPromise = new Promise<() => void>((resolve) => {
      resolveListen = resolve;
    });

    const unlistenSpy = mock(() => {});

    // Override mockListen for this test
    mockListen.mockImplementation(() => {
        return listenPromise;
    });

    const { unmount } = render(<App />);

    // Unmount immediately, before the promise resolves
    unmount();

    // Now resolve the promise with our spy
    resolveListen!(unlistenSpy);

    // Give it a tick to process the microtask queue
    await new Promise(r => setTimeout(r, 0));

    // Assert that unlistenSpy was called
    expect(unlistenSpy).toHaveBeenCalled();
  });
});
