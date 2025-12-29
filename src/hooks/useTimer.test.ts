import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "bun:test";
import { DEFAULT_TIMER_STATUS, mockInvoke } from "../setupTests";
import type { TimerStatus } from "../types";
import { useTimer } from "./useTimer";

describe("useTimer", () => {
  beforeEach(() => {
    // Mocks are reset in afterEach of setupTests
  });

  it("initializes with default status (not null)", () => {
    // Set invoke to never resolve - simulates slow backend
    mockInvoke.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useTimer());
    expect(result.current).toEqual(DEFAULT_TIMER_STATUS);
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

    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === "get_timer_state") {
        return Promise.resolve(backendStatus);
      }
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useTimer());

    await waitFor(
      () => {
        expect(result.current.dailyUsage).toEqual(100);
      },
      { timeout: 1000 }
    );
  });
});
