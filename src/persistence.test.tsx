import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "bun:test";
import App from "./App";
import "./setupTests";
import { clearStoreData, mockInvoke, setStoreData, setWindowLabel } from "./setupTests";

describe("Global Settings Persistence", () => {
  beforeEach(() => {
    clearStoreData();
    setWindowLabel("main");
  });

  it("syncs stored settings with backend on app startup", async () => {
    const storedConfig = {
      microbreak_interval: 555,
      microbreak_duration: 55,
      microbreak_enabled: true,
      rest_interval: 5555,
      rest_duration: 555,
      rest_enabled: true,
      daily_limit: 55555,
      daily_enabled: true,
      warning_duration: 55,
      mode: "Normal",
    };

    // Pre-populate the store
    setStoreData("break_config", storedConfig);

    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === "get_timer_state") {
        return Promise.resolve({
          mode: "Normal",
          microActive: 0,
          microTarget: 100,
          restTarget: 1000,
          breakType: null,
          breakDuration: 0,
          breakElapsed: 0,
        });
      }
      return Promise.resolve(null);
    });

    render(<App />);

    await waitFor(
      () => {
        expect(mockInvoke).toHaveBeenCalledWith("update_settings", expect.anything());
      },
      { timeout: 2000 }
    );
  });
});
