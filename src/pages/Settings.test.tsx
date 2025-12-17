import { describe, it, expect, mock, beforeEach } from "bun:test";
import { render, fireEvent, waitFor, within } from "@testing-library/react";
import { Settings } from "./Settings";
import { invoke } from "@tauri-apps/api/core";

describe("Settings", () => {
  beforeEach(() => {
    mock.restore();
    // Mock alert to prevent blocking
    global.alert = mock(() => {});
  });

  it("loads settings on mount", async () => {
    const mockConfig = {
      microbreak_interval: 180,
      microbreak_duration: 30,
      microbreak_enabled: true,
      rest_interval: 2700,
      rest_duration: 600,
      rest_enabled: true,
      daily_limit: 28800,
      daily_enabled: true,
      mode: "Normal",
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (invoke as any).mockImplementation((cmd: string) => {
      if (cmd === "get_settings") return Promise.resolve(mockConfig);
      return Promise.resolve(null);
    });

    const { baseElement } = render(<Settings />);
    const screen = within(baseElement);

    await waitFor(() => {
      expect(screen.getByDisplayValue("180")).toBeInTheDocument();
      expect(screen.getByDisplayValue("30")).toBeInTheDocument();
    });
  });

  it("saves settings on submit", async () => {
    const mockConfig = {
      microbreak_interval: 100,
      microbreak_duration: 20,
      microbreak_enabled: true,
      rest_interval: 2000,
      rest_duration: 500,
      rest_enabled: true,
      daily_limit: 20000,
      daily_enabled: true,
      mode: "Normal",
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (invoke as any).mockImplementation((cmd: string) => {
      if (cmd === "get_settings") return Promise.resolve(mockConfig);
      return Promise.resolve();
    });

    const { baseElement } = render(<Settings />);
    const screen = within(baseElement);

    await waitFor(() => {
      expect(screen.getByDisplayValue("100")).toBeInTheDocument();
    });

    const saveBtn = screen.getByText("Save Settings");
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith(
        "update_settings",
        expect.objectContaining({
          settings: expect.objectContaining({
            microbreak_interval: expect.any(Number),
            microbreak_duration: expect.any(Number),
          }),
        })
      );
    });
  });
});
