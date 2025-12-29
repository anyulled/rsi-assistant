import { fireEvent, render, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import "../setupTests";
import { mockInvoke, setWindowLabel } from "../setupTests";
import type { TimerStatus } from "../types";
import { BreakOverlay } from "./BreakOverlay";

// Mock useTimer hook
let mockTimerStatus: Partial<TimerStatus> = {};

mock.module("@/hooks/useTimer", () => ({
  useTimer: () => {
    console.log("Break state:", {
      breakType: mockTimerStatus.breakType,
      breakDuration: mockTimerStatus.breakDuration,
      breakElapsed: mockTimerStatus.breakElapsed,
    });
    return mockTimerStatus;
  },
}));

describe("BreakOverlay", () => {
  beforeEach(() => {
    setWindowLabel("overlay");
    mockTimerStatus = {};
  });

  it("renders initial state with micro break", () => {
    mockTimerStatus = {
      microIsOverdue: true,
      restIsOverdue: false,
      breakType: "micro",
      breakDuration: 20,
      breakElapsed: 0,
    };

    const { baseElement } = render(<BreakOverlay />);
    const screen = within(baseElement);

    expect(screen.getByText("Microbreak Time!")).toBeInTheDocument();
    expect(screen.getByText("Skip Break")).toBeInTheDocument();
  });

  it("renders rest break message", () => {
    mockTimerStatus = {
      microIsOverdue: false,
      restIsOverdue: true,
      breakType: "rest",
      breakDuration: 300,
      breakElapsed: 0,
    };

    const { baseElement } = render(<BreakOverlay />);
    const screen = within(baseElement);
    expect(screen.getByText("Rest Break Time!")).toBeInTheDocument();
  });

  it("displays progress bar with remaining time", () => {
    mockTimerStatus = {
      microIsOverdue: true,
      restIsOverdue: false,
      breakType: "micro",
      breakDuration: 20,
      breakElapsed: 5,
    };

    const { baseElement } = render(<BreakOverlay />);
    const screen = within(baseElement);

    expect(screen.getByText(/remaining/)).toBeInTheDocument();
    expect(screen.getByText("Break Progress")).toBeInTheDocument();
  });

  it("starts with a full countdown and full progress bar", () => {
    mockTimerStatus = {
      microIsOverdue: true,
      restIsOverdue: false,
      breakType: "micro",
      breakDuration: 20,
      breakElapsed: 0,
    };

    const { baseElement } = render(<BreakOverlay />);
    const screen = within(baseElement);

    expect(screen.getByText("0:20 remaining")).toBeInTheDocument();

    const progressBar = screen.getByTestId("progress-bar");
    expect(progressBar.getAttribute("style")).toContain("width: 100%");
  });

  it("shows reduced progress as time elapses", () => {
    mockTimerStatus = {
      microIsOverdue: true,
      restIsOverdue: false,
      breakType: "micro",
      breakDuration: 20,
      breakElapsed: 5,
    };

    const { baseElement } = render(<BreakOverlay />);
    const screen = within(baseElement);

    expect(screen.getByText("0:15 remaining")).toBeInTheDocument();

    const progressBar = screen.getByTestId("progress-bar");
    const width = progressBar.style.width.replace("%", "");
    expect(Number(width)).toBe(75);
  });

  it("calls skip break handler for micro break", async () => {
    mockTimerStatus = {
      microIsOverdue: true,
      restIsOverdue: false,
      breakType: "micro",
      breakDuration: 20,
      breakElapsed: 0,
    };

    const { baseElement } = render(<BreakOverlay />);
    const screen = within(baseElement);

    const skipBtn = screen.getByText("Skip Break");
    fireEvent.click(skipBtn);

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockInvoke).toHaveBeenCalledWith("record_break_postponed", { breakType: "micro" });
    expect(mockInvoke).toHaveBeenCalledWith("reset_break", { breakType: "micro" });
  });

  it("calls skip break handler for rest break", async () => {
    mockTimerStatus = {
      microIsOverdue: false,
      restIsOverdue: true,
      breakType: "rest",
      breakDuration: 300,
      breakElapsed: 0,
    };

    const { baseElement } = render(<BreakOverlay />);
    const screen = within(baseElement);

    const skipBtn = screen.getByText("Skip Break");
    fireEvent.click(skipBtn);

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockInvoke).toHaveBeenCalledWith("record_break_postponed", { breakType: "rest" });
    expect(mockInvoke).toHaveBeenCalledWith("reset_break", { breakType: "rest" });
  });

  it("uses rest_duration for rest breaks", () => {
    mockTimerStatus = {
      microIsOverdue: false,
      restIsOverdue: true,
      breakType: "rest",
      breakDuration: 180,
      breakElapsed: 0,
    };

    const { baseElement } = render(<BreakOverlay />);
    const screen = within(baseElement);

    expect(screen.getByText("3:00 remaining")).toBeInTheDocument();
  });

  it("shows default message when no break type", () => {
    mockTimerStatus = {
      microIsOverdue: false,
      restIsOverdue: false,
      breakType: null,
      breakDuration: 0,
      breakElapsed: 0,
    };

    const { baseElement } = render(<BreakOverlay />);
    const screen = within(baseElement);

    expect(screen.getByText("Time for a break!")).toBeInTheDocument();
  });
});
