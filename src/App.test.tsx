import { render, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "bun:test";
import App from "./App";
import "./setupTests";
import { clearStoreData, mockInvoke, setWindowLabel } from "./setupTests";

describe("App", () => {
  beforeEach(() => {
    clearStoreData();
    setWindowLabel("main");
  });

  it("renders Timer view by default", async () => {
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

    const { baseElement } = render(<App />);
    const screen = within(baseElement);

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Timer" })).toBeInTheDocument();
      expect(screen.getByText(/Mode:/)).toBeInTheDocument();
    });
  });

  it("navigates to Settings view", async () => {
    const user = userEvent.setup();
    mockInvoke.mockImplementation((cmd: string) => {
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
    setWindowLabel("overlay");

    mockInvoke.mockImplementation((cmd: string) => {
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
    expect(screen.queryByRole("tab", { name: "Timer" })).toBeNull();
  });
});
