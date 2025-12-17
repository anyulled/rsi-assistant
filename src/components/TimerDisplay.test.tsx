import { describe, it, expect } from "bun:test";
import { render, within } from "@testing-library/react";
import { TimerDisplay } from "./TimerDisplay";
import type { TimerStatus } from "@/types";

describe("TimerDisplay", () => {
    it("renders status correctly with circular progress", () => {
        const mockStatus: TimerStatus = {
            daily_usage: 1200,
            daily_limit: 3600,
            micro_active: 300,
            micro_target: 600,
            micro_is_overdue: false,
            rest_active: 0,
            rest_target: 300,
            rest_is_overdue: false,
            current_idle: 5,
            mode: "Normal",
        };

        const { container } = render(<TimerDisplay status={mockStatus} />);

        // Check mode is displayed
        expect(within(container).getByText(/Mode: Normal/)).toBeDefined();

        // Check section labels
        expect(within(container).getByText("Micro-break")).toBeDefined();
        expect(within(container).getByText("Rest break")).toBeDefined();
        expect(within(container).getByText("Daily limit")).toBeDefined();

        // Check that values are displayed in progress circles
        expect(within(container).getByText("300")).toBeDefined(); // micro_active value
        expect(within(container).getByText("/ 600s")).toBeDefined(); // micro_target
        expect(within(container).getByText("1200")).toBeDefined(); // daily_usage value

        // Check current idle
        expect(within(container).getByText(/Current idle:/)).toBeDefined();
    });

    it("shows overdue status when breaks are overdue", () => {
        const mockStatus: TimerStatus = {
            daily_usage: 100,
            daily_limit: 3600,
            micro_active: 700,
            micro_target: 600,
            micro_is_overdue: true,
            rest_active: 400,
            rest_target: 300,
            rest_is_overdue: true,
            current_idle: 0,
            mode: "Normal",
        };

        const { container } = render(<TimerDisplay status={mockStatus} />);

        // Should show "Overdue!" text twice (for micro and rest)
        const overdueElements = within(container).getAllByText("Overdue!");
        expect(overdueElements.length).toBe(2);
    });

    it("displays values in circular progress indicators", () => {
        const mockStatus: TimerStatus = {
            daily_usage: 1800,
            daily_limit: 3600,
            micro_active: 300,
            micro_target: 600,
            micro_is_overdue: false,
            rest_active: 150,
            rest_target: 300,
            rest_is_overdue: false,
            current_idle: 10,
            mode: "Quiet",
        };

        const { container } = render(<TimerDisplay status={mockStatus} />);

        // Check that numeric values are displayed in the circles
        expect(within(container).getByText("300")).toBeDefined(); // micro_active
        expect(within(container).getByText("150")).toBeDefined(); // rest_active
        expect(within(container).getByText("1800")).toBeDefined(); // daily_usage
    });
});
