import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "bun:test";
import { DEFAULT_TIMER_STATUS, mockInvoke } from "../setupTests";
import type { TimerStatus } from "../types";
import { useTimer } from "./useTimer";

describe("useTimer", () => {
  beforeEach(() => {
    // Mocks are reset in afterEach of setupTests
    // Ensure mockInvoke is in a clean state
    mockInvoke.mockClear();
  });

  it("initializes with default status (not null)", () => {
    // The setupTests default mockInvoke returns DEFAULT_TIMER_STATUS immediately.
    // However, useState initialization happens before effects run.
    // So result.current should start as DEFAULT_TIMER_STATUS.
    // Even if effect runs and updates it, it updates it to the SAME value (DEFAULT_TIMER_STATUS).

    const { result } = renderHook(() => useTimer());
    expect(result.current).toEqual(DEFAULT_TIMER_STATUS);
  });

  it("updates status when backend returns data", async () => {
    const backendStatus: TimerStatus = {
      ...DEFAULT_TIMER_STATUS,
      dailyUsage: 100,
      mode: "Quiet",
    };

    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === "get_timer_state") {
        return Promise.resolve(backendStatus);
      }
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useTimer());

    // Wait for the update to happen
    await waitFor(
      () => {
        expect(result.current).toEqual(backendStatus);
      },
      { timeout: 1000 }
    );

    expect(mockInvoke).toHaveBeenCalledWith("get_timer_state");
  });
});
