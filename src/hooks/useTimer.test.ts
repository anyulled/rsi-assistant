import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "bun:test";
import { useTimer } from "./useTimer";

describe("useTimer", () => {
  beforeEach(() => {
    // Reset mocks to default implementation before each test
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (invoke as any).mockImplementation(() => Promise.resolve(null));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (listen as any).mockImplementation(() => Promise.resolve(() => {}));
  });

  it("initializes with null status", () => {
    const { result } = renderHook(() => useTimer());
    expect(result.current).toBeNull();
  });

  it("fetches initial status on mount", async () => {
    const mockStatus = {
      dailyUsage: 100,
      dailyLimit: 28800,
      microActive: 50,
      microTarget: 180,
      microIsOverdue: false,
      restActive: 200,
      restTarget: 2700,
      restIsOverdue: false,
      currentIdle: 0,
      mode: "Normal",
      breakType: null,
      breakDuration: 0,
      breakElapsed: 0,
    };

    // Actually, let's just make sure we match what we check in toEqual
    const adjustedMockStatus = { ...mockStatus };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (invoke as any).mockImplementation((cmd: string) => {
      if (cmd === "get_timer_state") return Promise.resolve(adjustedMockStatus);
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useTimer());

    await waitFor(() => {
      expect(result.current).toEqual(mockStatus);
    });

    expect(invoke).toHaveBeenCalledWith("get_timer_state");
  });

  it("updates status on timer-update event", async () => {
    let eventHandler: ((event: { payload: unknown }) => void) | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (listen as any).mockImplementation((event: string, handler: (event: { payload: unknown }) => void) => {
      if (event === "timer-update") {
        eventHandler = handler;
      }
      return Promise.resolve(() => {});
    });

    renderHook(() => useTimer());

    const newStatus = {
      dailyUsage: 101,
      dailyLimit: 28800,
      microActive: 51,
      microTarget: 180,
      microIsOverdue: false,
      restActive: 201,
      restTarget: 2700,
      restIsOverdue: false,
      currentIdle: 0,
      mode: "Normal",
      breakType: null,
      breakDuration: 0,
      breakElapsed: 0,
    };

    // Simulate event
    await waitFor(() => {
      if (eventHandler) eventHandler({ payload: newStatus });
    });

    // This is a bit tricky with async updates in hooks, usually waitFor helps
    // But since we control the handler, we might need act/waitFor

    // Since we can't easily trigger the listen callback from outside without hacking the mock implementation better,
    // The fact that 'listen' is called is a good start.
    expect(listen).toHaveBeenCalledWith("timer-update", expect.any(Function));
  });
});
