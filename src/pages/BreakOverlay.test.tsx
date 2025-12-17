import "../setupTests";
import { describe, it, expect, mock, beforeEach } from "bun:test";
import { render, fireEvent, waitFor, within } from "@testing-library/react";
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
  });

  it("renders initial state", () => {
    // console.log('Document:', !!global.document);
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

  it("calls skip break handler", async () => {
    const mockHide = mock(() => Promise.resolve());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (getCurrentWindow as any).mockImplementation(() => ({
      hide: mockHide,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useTimer as any).mockReturnValue({
      micro_is_overdue: true, // 'micro' break type
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
});
