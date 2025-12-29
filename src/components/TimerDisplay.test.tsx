import type { TimerStatus } from "@/types";
import { render, within } from "@testing-library/react";
import { describe, expect, it } from "bun:test";
import { TimerDisplay } from "./TimerDisplay";

describe("TimerDisplay", () => {
  it("renders status correctly with circular progress", () => {
    const mockStatus: TimerStatus = {
      dailyUsage: 1200,
      dailyLimit: 3600,
      microActive: 300,
      microTarget: 600,
      microIsOverdue: false,
      restActive: 0,
      restTarget: 300,
      restIsOverdue: false,
      currentIdle: 5,
      mode: "Normal",
      breakType: null,
      breakDuration: 0,
      breakElapsed: 0,
    };

    const { container } = render(<TimerDisplay status={mockStatus} />);

    // Check mode is displayed
    expect(within(container).getByText(/Mode: Normal/)).toBeDefined();

    // Check section labels
    expect(within(container).getByText("Micro-break")).toBeDefined();
    expect(within(container).getByText("Rest break")).toBeDefined();
    expect(within(container).getByText("Daily limit")).toBeDefined();

    // Check that values are displayed in progress circles
    expect(within(container).getByText("300")).toBeDefined(); // microActive value
    expect(within(container).getByText("/ 600s")).toBeDefined(); // microTarget
    expect(within(container).getByText("1200")).toBeDefined(); // dailyUsage value

    // Check current idle
    expect(within(container).getByText(/Current idle:/)).toBeDefined();
  });

  it("shows overdue status when breaks are overdue", () => {
    const mockStatus: TimerStatus = {
      dailyUsage: 100,
      dailyLimit: 3600,
      microActive: 700,
      microTarget: 600,
      microIsOverdue: true,
      restActive: 400,
      restTarget: 300,
      restIsOverdue: true,
      currentIdle: 0,
      mode: "Normal",
      breakType: null,
      breakDuration: 0,
      breakElapsed: 0,
    };

    const { container } = render(<TimerDisplay status={mockStatus} />);

    // Should show "Overdue!" text twice (for micro and rest)
    const overdueElements = within(container).getAllByText("Overdue!");
    expect(overdueElements.length).toBe(2);
  });

  it("displays values in circular progress indicators", () => {
    const mockStatus: TimerStatus = {
      dailyUsage: 1800,
      dailyLimit: 3600,
      microActive: 300,
      microTarget: 600,
      microIsOverdue: false,
      restActive: 150,
      restTarget: 300,
      restIsOverdue: false,
      currentIdle: 10,
      mode: "Quiet",
      breakType: null,
      breakDuration: 0,
      breakElapsed: 0,
    };

    const { container } = render(<TimerDisplay status={mockStatus} />);

    // Check that numeric values are displayed in the circles
    expect(within(container).getByText("300")).toBeDefined(); // microActive
    expect(within(container).getByText("150")).toBeDefined(); // restActive
    expect(within(container).getByText("1800")).toBeDefined(); // dailyUsage
  });
});
