import { useTimer } from "@/hooks/useTimer";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { fireEvent, render, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import "../setupTests";
import { BreakOverlay } from "./BreakOverlay";

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
      return Promise.resolve();
    });
  });

  it("renders initial state with micro break", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useTimer as any).mockReturnValue({
      microIsOverdue: true,
      restIsOverdue: false,
      breakType: "micro",
      breakDuration: 20,
      breakElapsed: 0,
    });

    const { baseElement } = render(<BreakOverlay />);
    const screen = within(baseElement);

    expect(screen.getByText("Microbreak Time!")).toBeInTheDocument();
    expect(screen.getByText("Skip Break")).toBeInTheDocument();
  });

  it("renders rest break message", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useTimer as any).mockReturnValue({
      microIsOverdue: false,
      restIsOverdue: true,
      breakType: "rest",
      breakDuration: 300,
      breakElapsed: 0,
    });

    const { baseElement } = render(<BreakOverlay />);
    const screen = within(baseElement);
    expect(screen.getByText("Rest Break Time!")).toBeInTheDocument();
  });

  it("displays progress bar with remaining time", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useTimer as any).mockReturnValue({
      microIsOverdue: true,
      restIsOverdue: false,
      breakType: "micro",
      breakDuration: 20,
      breakElapsed: 5,
    });

    const { baseElement } = render(<BreakOverlay />);
    const screen = within(baseElement);

    // Progress bar should show remaining time (15 seconds = 0:15)
    expect(screen.getByText(/remaining/)).toBeInTheDocument();
    expect(screen.getByText("Break Progress")).toBeInTheDocument();
  });

  it("starts with a full countdown and full progress bar", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useTimer as any).mockReturnValue({
      microIsOverdue: true,
      restIsOverdue: false,
      breakType: "micro",
      breakDuration: 20,
      breakElapsed: 0,
    });

    const { baseElement } = render(<BreakOverlay />);
    const screen = within(baseElement);

    expect(screen.getByText("0:20 remaining")).toBeInTheDocument();

    const progressBar = screen.getByTestId("progress-bar");
    expect(progressBar.getAttribute("style")).toContain("width: 100%");
  });

  it("shows reduced progress as time elapses", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useTimer as any).mockReturnValue({
      microIsOverdue: true,
      restIsOverdue: false,
      breakType: "micro",
      breakDuration: 20,
      breakElapsed: 5, // 5 seconds elapsed
    });

    const { baseElement } = render(<BreakOverlay />);
    const screen = within(baseElement);

    expect(screen.getByText("0:15 remaining")).toBeInTheDocument();

    const progressBar = screen.getByTestId("progress-bar");
    const width = progressBar.style.width.replace("%", "");
    expect(Number(width)).toBe(75); // 15/20 = 75%
  });

  it("calls skip break handler for micro break", async () => {
    const mockHide = mock(() => Promise.resolve());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (getCurrentWindow as any).mockImplementation(() => ({
      hide: mockHide,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useTimer as any).mockReturnValue({
      microIsOverdue: true,
      restIsOverdue: false,
      breakType: "micro",
      breakDuration: 20,
      breakElapsed: 0,
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
      microIsOverdue: false,
      restIsOverdue: true,
      breakType: "rest",
      breakDuration: 300,
      breakElapsed: 0,
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

  it("uses rest_duration for rest breaks", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useTimer as any).mockReturnValue({
      microIsOverdue: false,
      restIsOverdue: true,
      breakType: "rest",
      breakDuration: 180, // 3 minutes
      breakElapsed: 0,
    });

    const { baseElement } = render(<BreakOverlay />);
    const screen = within(baseElement);

    // Should show remaining time based on 180 seconds (3:00)
    expect(screen.getByText("3:00 remaining")).toBeInTheDocument();
  });

  it("shows default message when no break type", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useTimer as any).mockReturnValue({
      microIsOverdue: false,
      restIsOverdue: false,
      breakType: null,
      breakDuration: 0,
      breakElapsed: 0,
    });

    const { baseElement } = render(<BreakOverlay />);
    const screen = within(baseElement);

    expect(screen.getByText("Time for a break!")).toBeInTheDocument();
  });
});
