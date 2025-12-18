import "./setupTests";
import { describe, it, expect, mock, beforeEach } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import App from "./App";
import { invoke } from "@tauri-apps/api/core";
import { load } from "@tauri-apps/plugin-store";
import { getCurrentWindow } from "@tauri-apps/api/window";

describe("Global Settings Persistence", () => {
  beforeEach(() => {
    mock.restore();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (getCurrentWindow as any).mockImplementation(() => ({
      label: "main",
      hide: mock(() => Promise.resolve()),
    }));
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

    // Mock store to return persisted settings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (load as any).mockImplementation(() =>
      Promise.resolve({
        get: mock(() => Promise.resolve(storedConfig)),
        set: mock(() => Promise.resolve()),
        save: mock(() => Promise.resolve()),
      })
    );

    // Mock invoke
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (invoke as any).mockImplementation((cmd: string) => {
      if (cmd === "get_timer_state") {
        return Promise.resolve({
          mode: "Normal",
          micro_active: 0,
          micro_target: 100,
          rest_target: 1000,
        });
      }
      return Promise.resolve();
    });

    render(<App />);

    // Verify backend is synced with stored settings on startup
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("update_settings", { settings: storedConfig });
    });
  });
});
