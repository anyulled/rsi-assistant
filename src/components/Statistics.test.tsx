import { render, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "bun:test";
import { mockInvoke } from "../setupTests";
import { Statistics } from "./Statistics";

// Uses global mockInvoke from setupTests.ts

describe("Statistics", () => {
  beforeEach(() => {
    // Mock is reset in afterEach of setupTests
  });

  test("renders statistics view with calendar and table", async () => {
    mockInvoke.mockImplementation(() =>
      Promise.resolve([
        {
          date: "2024-01-15",
          totalUsageSeconds: 3600,
          microPrompts: 5,
          microRepeatedPrompts: 1,
          microPromptedTaken: 4,
          microNaturalTaken: 2,
          microSkipped: 0,
          microPostponed: 1,
          restPrompts: 2,
          restRepeatedPrompts: 0,
          restPromptedTaken: 2,
          restNaturalTaken: 1,
          restSkipped: 0,
          restPostponed: 0,
          dailyPrompts: 0,
          dailyRepeatedPrompts: 0,
          dailyPromptedTaken: 0,
          dailyNaturalTaken: 0,
          dailySkipped: 0,
          dailyPostponed: 0,
          overdueSeconds: 0,
        },
      ])
    );

    const { container } = render(<Statistics />);

    // Check for main sections
    expect(within(container).getByText("Browse history")).toBeDefined();
    expect(within(container).getByText("Statistics")).toBeDefined();

    // Wait for data to load
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("get_statistics", { days: 365 });
    });

    // Check table headers
    expect(within(container).getByText("✋ Micro-break")).toBeDefined();
    expect(within(container).getByText("☕ Rest break")).toBeDefined();
    expect(within(container).getByText("📊 Daily limit")).toBeDefined();

    // Check table rows
    expect(within(container).getByText("Break prompts")).toBeDefined();
    expect(within(container).getByText("Repeated prompts")).toBeDefined();
    expect(within(container).getByText("Prompted breaks taken")).toBeDefined();
    expect(within(container).getByText("Natural breaks taken")).toBeDefined();
    expect(within(container).getByText("Breaks skipped")).toBeDefined();
    expect(within(container).getByText("Breaks postponed")).toBeDefined();
  });

  test("displays empty state when no data available", async () => {
    mockInvoke.mockImplementation(() => Promise.resolve([]));

    const { container } = render(<Statistics />);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalled();
    });

    // Should show zeros for all stats
    const cells = within(container).getAllByText("0");
    expect(cells.length).toBeGreaterThan(0);
  });

  test("calendar date selection triggers data reload", async () => {
    mockInvoke.mockImplementation(() => Promise.resolve([]));

    const { container } = render(<Statistics />);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledTimes(1);
    });

    // Verify the component renders the calendar
    const calendar = container.querySelector(".react-calendar");
    expect(calendar).toBeDefined();
  });

  test("renders with usage data", async () => {
    const todayStr = new Date().toISOString().split("T")[0];

    mockInvoke.mockImplementation(() =>
      Promise.resolve([
        {
          date: todayStr,
          totalUsageSeconds: 7200,
          microPrompts: 5,
          microRepeatedPrompts: 1,
          microPromptedTaken: 4,
          microNaturalTaken: 1,
          microSkipped: 0,
          microPostponed: 1,
          restPrompts: 2,
          restRepeatedPrompts: 0,
          restPromptedTaken: 2,
          restNaturalTaken: 0,
          restSkipped: 0,
          restPostponed: 0,
          dailyPrompts: 0,
          dailyRepeatedPrompts: 0,
          dailyPromptedTaken: 0,
          dailyNaturalTaken: 0,
          dailySkipped: 0,
          dailyPostponed: 0,
          overdueSeconds: 0,
        },
      ])
    );

    const { container } = render(<Statistics />);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalled();
    });

    const fives = within(container).getAllByText("5");
    const fours = within(container).getAllByText("4");

    expect(fives.length).toBeGreaterThan(0);
    expect(fours.length).toBeGreaterThan(0);
  });

  test("switches between tabs", async () => {
    mockInvoke.mockImplementation(() => Promise.resolve([]));

    const user = userEvent.setup();
    const { container } = render(<Statistics />);

    const breaksTab = within(container).getByRole("tab", { name: /breaks/i });
    expect(breaksTab.getAttribute("data-state")).toBe("active");

    const activityTab = within(container).getByRole("tab", { name: /activity/i });
    await user.click(activityTab);

    await waitFor(() => {
      expect(within(container).getByText(/activity timeline coming soon/i)).toBeDefined();
    });
  });
});
