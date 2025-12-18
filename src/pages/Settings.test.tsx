import "../setupTests";
import { describe, it, expect, mock, beforeEach } from "bun:test";
import { render, fireEvent, waitFor, within } from "@testing-library/react";
import { Settings } from "./Settings";
import { invoke } from "@tauri-apps/api/core";
import { load } from "@tauri-apps/plugin-store";
import { FakeStore } from "../testUtils";

describe("Settings", () => {
  let mockStore: FakeStore;

  beforeEach(() => {
    // Reset mocks
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (invoke as any).mockReset();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (load as any).mockReset();

    global.alert = mock(() => {});

    // Default mock implementation for load
    mockStore = new FakeStore();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (load as any).mockImplementation(() => Promise.resolve(mockStore));
  });

  it("loads settings from backend on mount when store is empty", async () => {
    const backendConfig = {
      microbreak_interval: 180,
      microbreak_duration: 30,
      microbreak_enabled: true,
      rest_interval: 2700,
      rest_duration: 600,
      rest_enabled: true,
      daily_limit: 28800,
      daily_enabled: true,
      warning_duration: 30,
      mode: "Normal",
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (invoke as any).mockImplementation((cmd: string) => {
      if (cmd === "get_settings") return Promise.resolve(backendConfig);
      return Promise.resolve(null);
    });

    const { baseElement } = render(<Settings />);
    const screen = within(baseElement);

    await waitFor(() => {
      // Check interval (180s)
      expect(screen.getByDisplayValue("180")).toBeInTheDocument();
      // Check daily limit converted to hours: 28800 / 3600 = 8
      expect(screen.getByDisplayValue("8")).toBeInTheDocument();
    });
  });

  it("persists settings to store when saved", async () => {
    const backendConfig = {
      microbreak_interval: 100,
      microbreak_duration: 20,
      microbreak_enabled: true,
      rest_interval: 2000,
      rest_duration: 500,
      rest_enabled: true,
      daily_limit: 4000,
      daily_enabled: false,
      warning_duration: 30,
      mode: "Normal",
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (invoke as any).mockImplementation((cmd: string) => {
      if (cmd === "get_settings") return Promise.resolve(backendConfig);
      return Promise.resolve();
    });

    const { baseElement } = render(<Settings />);
    const screen = within(baseElement);
    await screen.findByText("Save Settings");

    const form = baseElement.querySelector("form");
    if (form) fireEvent.submit(form);
    else console.error("Form not found!");

    await waitFor(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stored = await mockStore.get<any>("break_config");
      expect(stored).toBeTruthy();
      expect(stored.microbreak_interval).toBe(100);
    });
  });

  it("loads settings from store on mount if available", async () => {
    const storedConfig = {
      microbreak_interval: 250,
      microbreak_duration: 45,
      microbreak_enabled: true,
      rest_interval: 3000,
      rest_duration: 700,
      rest_enabled: true,
      daily_limit: 7200, // 2 hours
      daily_enabled: true,
      warning_duration: 30,
      mode: "Quiet",
    };

    await mockStore.set("break_config", storedConfig);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (invoke as any).mockImplementation((cmd: string) => {
      // Backend has defaults
      if (cmd === "get_settings")
        return Promise.resolve({
          ...storedConfig,
          microbreak_interval: 180,
          mode: "Normal",
        });
      return Promise.resolve();
    });

    const { baseElement } = render(<Settings />);
    const screen = within(baseElement);

    await waitFor(() => {
      // Should display STORED value 250
      expect(screen.getByDisplayValue("250")).toBeInTheDocument();
      // Should display STORED mode Quiet
      const modeSelect = screen.getByDisplayValue("Quiet");
      expect(modeSelect).toBeInTheDocument();
      // Should display STORED daily limit as hours (2)
      expect(screen.getByDisplayValue("2")).toBeInTheDocument();
    });
  });

  it("has expected layout classes", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (invoke as any).mockResolvedValue({});
    const { container } = render(<Settings />);

    // Wait for form to render
    await waitFor(() => {
      const grid = container.querySelector('div[class*="md:grid-cols-2"]');
      expect(grid).toBeInTheDocument();
    });
  });
});
