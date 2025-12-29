import { getCurrentWindow } from "@tauri-apps/api/window";
import { render, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import App from "./App";
import "./setupTests";

import { invoke } from "@tauri-apps/api/core";

// Removed component mocks to avoid conflict with other tests
// We will test App integration with real child components (or mock them efficiently if needed, but integration is better)

import userEvent from "@testing-library/user-event";

// Ensure no global mocks leak
// We mock invoke to control useTimer's data fetching

describe("App", () => {
  beforeEach(() => {
    mock.restore();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (getCurrentWindow as any).mockImplementation(() => ({
      label: "main",
      hide: mock(() => Promise.resolve()),
    }));
  });

  it("renders Timer view by default", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (invoke as any).mockImplementation((cmd: string) => {
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

    const { baseElement } = render(<App />);
    const screen = within(baseElement);

    // Wait for useTimer to fetch state
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Timer" })).toBeInTheDocument();
      expect(screen.getByText(/Mode:/)).toBeInTheDocument();
    });
  });

  it("navigates to Settings view", async () => {
    const user = userEvent.setup();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (invoke as any).mockImplementation((cmd: string) => {
      // Return just enough for components to not crash
      if (cmd === "get_timer_state")
        return Promise.resolve({
          mode: "Normal",
          microActive: 0,
          microTarget: 100,
          restTarget: 1000,
          breakType: null,
          breakDuration: 0,
          breakElapsed: 0,
        });
      if (cmd === "get_settings") return Promise.resolve({});
      return Promise.resolve(null);
    });

    const { baseElement } = render(<App />);
    const screen = within(baseElement);

    const settingsTab = screen.getByRole("tab", { name: "Settings" });
    await user.click(settingsTab);

    await waitFor(() => {
      expect(screen.getByText("Save Settings")).toBeInTheDocument();
    });
  });

  it("renders BreakOverlay if window label is overlay", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (getCurrentWindow as any).mockImplementation(() => ({
      label: "overlay",
      hide: mock(() => Promise.resolve()),
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (invoke as any).mockImplementation((cmd: string) => {
      if (cmd === "get_timer_state") {
        return Promise.resolve({
          microIsOverdue: true,
          restIsOverdue: false,
          mode: "Normal",
          microTarget: 100,
          restTarget: 1000,
          breakType: "micro",
          breakDuration: 20,
          breakElapsed: 0,
        });
      }
      return Promise.resolve(null);
    });

    const { baseElement } = render(<App />);
    const screen = within(baseElement);

    await waitFor(() => {
      expect(screen.getByText("Microbreak Time!")).toBeInTheDocument();
    });
    // Navigation buttons should NOT be present
    expect(screen.queryByRole("tab", { name: "Timer" })).toBeNull();
  });
});
