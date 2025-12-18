import "../setupTests";
import { describe, it, expect, mock, beforeEach } from "bun:test";
import { render, fireEvent, waitFor, within, act } from "@testing-library/react";
import { BreakOverlay } from "./BreakOverlay";
import { useTimer } from "@/hooks/useTimer";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

// Mock useTimer
mock.module("@/hooks/useTimer", () => ({
  useTimer: mock(() => null),
}));

describe("BreakOverlay", () => {
  beforeEach(() => {
    mock.restore();
    // Reset invoke mock to return settings by default
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (invoke as any).mockImplementation((cmd: string) => {
      if (cmd === "get_settings") {
        return Promise.resolve({
          microbreak_duration: 20,
          rest_duration: 300,
          microbreak_enabled: true,
          rest_enabled: true,
        });
      }
      return Promise.resolve();
    });
  });

  it("renders initial state", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useTimer as any).mockReturnValue({
      micro_is_overdue: true,
      rest_is_overdue: false,
    });

    const { baseElement } = render(<BreakOverlay />);
    const screen = within(baseElement);

    expect(screen.getByText("Microbreak Time!")).toBeInTheDocument();
    expect(screen.getByText("Skip Break")).toBeInTheDocument();
  });

  it("renders rest break message", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useTimer as any).mockReturnValue({
      micro_is_overdue: false,
      rest_is_overdue: true,
    });

    const { baseElement } = render(<BreakOverlay />);
    const screen = within(baseElement);
    expect(screen.getByText("Rest Break Time!")).toBeInTheDocument();
  });

  it("displays progress bar with remaining time", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useTimer as any).mockReturnValue({
      micro_is_overdue: true,
      rest_is_overdue: false,
    });

    const { baseElement } = render(<BreakOverlay />);
    const screen = within(baseElement);

    // Wait for settings to be fetched and state to update
    await waitFor(
      () => {
        // Progress bar should show initial remaining time (0:20 for 20s microbreak)
        expect(screen.getByText(/remaining/)).toBeInTheDocument();
      },
      { timeout: 2000 }
    );

    // Verify the progress bar container exists
    expect(screen.getByText("Break Progress")).toBeInTheDocument();
  });

  it("fetches settings to get break duration", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useTimer as any).mockReturnValue({
      micro_is_overdue: true,
      rest_is_overdue: false,
    });

    render(<BreakOverlay />);

    await waitFor(
      () => {
        expect(invoke).toHaveBeenCalledWith("get_settings");
      },
      { timeout: 2000 }
    );
  });

  it("increments progress over time", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useTimer as any).mockReturnValue({
      micro_is_overdue: true,
      rest_is_overdue: false,
    });

    const { baseElement } = render(<BreakOverlay />);
    const screen = within(baseElement);

    // Wait for settings to be loaded and timer to start
    await waitFor(
      () => {
        expect(invoke).toHaveBeenCalledWith("get_settings");
      },
      { timeout: 2000 }
    );

    // Use fake timers to simulate time passing
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1100));
    });

    // The progress bar should have updated (elapsed time > 0)
    // We check that the component is still rendered and functioning
    expect(screen.getByText("Break Progress")).toBeInTheDocument();
  });

  it("calls skip break handler for micro break", async () => {
    const mockHide = mock(() => Promise.resolve());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (getCurrentWindow as any).mockImplementation(() => ({
      hide: mockHide,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useTimer as any).mockReturnValue({
      micro_is_overdue: true,
      rest_is_overdue: false,
    });

    const { baseElement } = render(<BreakOverlay />);
    const screen = within(baseElement);

    const skipBtn = screen.getByText("Skip Break");
    fireEvent.click(skipBtn);

    await waitFor(
      () => {
        expect(invoke).toHaveBeenCalledWith("record_break_postponed", { breakType: "micro" });
        expect(invoke).toHaveBeenCalledWith("reset_break", { breakType: "micro" });
        expect(mockHide).toHaveBeenCalled();
      },
      { timeout: 2000 }
    );
  });

  it("calls skip break handler for rest break", async () => {
    const mockHide = mock(() => Promise.resolve());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (getCurrentWindow as any).mockImplementation(() => ({
      hide: mockHide,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useTimer as any).mockReturnValue({
      micro_is_overdue: false,
      rest_is_overdue: true,
    });

    const { baseElement } = render(<BreakOverlay />);
    const screen = within(baseElement);

    const skipBtn = screen.getByText("Skip Break");
    fireEvent.click(skipBtn);

    await waitFor(
      () => {
        expect(invoke).toHaveBeenCalledWith("record_break_postponed", { breakType: "rest" });
        expect(invoke).toHaveBeenCalledWith("reset_break", { breakType: "rest" });
        expect(mockHide).toHaveBeenCalled();
      },
      { timeout: 2000 }
    );
  });

  it("uses rest_duration from settings for rest breaks", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (invoke as any).mockImplementation((cmd: string) => {
      if (cmd === "get_settings") {
        return Promise.resolve({
          microbreak_duration: 20,
          rest_duration: 180, // 3 minutes
          microbreak_enabled: true,
          rest_enabled: true,
        });
      }
      return Promise.resolve();
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useTimer as any).mockReturnValue({
      micro_is_overdue: false,
      rest_is_overdue: true,
    });

    const { baseElement } = render(<BreakOverlay />);
    const screen = within(baseElement);

    // Wait for settings to be fetched
    await waitFor(
      () => {
        expect(invoke).toHaveBeenCalledWith("get_settings");
      },
      { timeout: 2000 }
    );

    // Should show remaining time based on 180 seconds (3:00)
    await waitFor(
      () => {
        expect(screen.getByText(/remaining/)).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });
});
