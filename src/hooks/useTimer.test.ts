import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "bun:test";
import { getDefaultTimerStatus, mockInvoke } from "../setupTests";
import type { TimerStatus } from "../types";
import { useTimer } from "./useTimer";

describe("useTimer", () => {
  beforeEach(() => {
    mockInvoke.mockClear();
  });

  it("initializes with default status (not null)", async () => {
    let result: { current: TimerStatus };

    await act(async () => {
      const hook = renderHook(() => useTimer());
      result = hook.result;
    });

    // Compare by value using fresh factory result
    expect(result!.current).toEqual(getDefaultTimerStatus());
  });

  it("updates status when backend returns data", async () => {
    const backendStatus: TimerStatus = {
      ...getDefaultTimerStatus(),
      dailyUsage: 100,
      mode: "Quiet",
    };

    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === "get_timer_state") {
        return Promise.resolve(backendStatus);
      }
      return Promise.resolve(null);
    });

    let result: { current: TimerStatus };

    await act(async () => {
      const hook = renderHook(() => useTimer());
      result = hook.result;
    });

    await waitFor(
      () => {
        expect(result!.current.dailyUsage).toBe(100);
        expect(result!.current.mode).toBe("Quiet");
      },
      { timeout: 1000 }
    );

    expect(mockInvoke).toHaveBeenCalledWith("get_timer_state");
  });
});
