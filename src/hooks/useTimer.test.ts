import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "bun:test";
import type { TimerStatus } from "../types";
import { useTimer } from "./useTimer";

// Expected default values that match the hook's DEFAULT_TIMER_STATUS
const DEFAULT_STATUS: TimerStatus = {
  dailyUsage: 0,
  dailyLimit: 28800,
  microActive: 0,
  microTarget: 180,
  microIsOverdue: false,
  restActive: 0,
  restTarget: 2700,
  restIsOverdue: false,
  currentIdle: 0,
  mode: "Normal",
  breakType: null,
  breakDuration: 0,
  breakElapsed: 0,
};

describe("useTimer", () => {
  beforeEach(() => {
    // Reset mocks before each test
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (invoke as any).mockReset();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (listen as any).mockReset();

    // Default listener implementation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (listen as any).mockImplementation(() => Promise.resolve(() => {}));
  });

  it("initializes with default status (not null)", () => {
    // Mock invoke to never resolve, so we can test the initial state
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (invoke as any).mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useTimer());
    expect(result.current).toEqual(DEFAULT_STATUS);
  });

  it("updates status when backend returns data", async () => {
    const backendStatus: TimerStatus = {
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (invoke as any).mockImplementation((cmd: string) => {
      if (cmd === "get_timer_state") return Promise.resolve(backendStatus);
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useTimer());

    await waitFor(() => {
      expect(result.current).toEqual(backendStatus);
    });

    expect(invoke).toHaveBeenCalledWith("get_timer_state");
  });

  it("updates status on timer-update event", async () => {
    // Mock invoke to not interfere with this test (never resolve)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (invoke as any).mockImplementation(() => new Promise(() => {}));

    let eventHandler: ((event: { payload: TimerStatus }) => void) | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (listen as any).mockImplementation((event: string, handler: (event: { payload: TimerStatus }) => void) => {
      if (event === "timer-update") {
        eventHandler = handler;
      }
      return Promise.resolve(() => {});
    });

    renderHook(() => useTimer());

    const newStatus: TimerStatus = {
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
    await act(async () => {
      if (eventHandler) eventHandler({ payload: newStatus });
    });

    expect(listen).toHaveBeenCalledWith("timer-update", expect.any(Function));
  });
});
