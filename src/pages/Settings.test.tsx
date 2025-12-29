import { fireEvent, render, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import "../setupTests";
import { FakeStore, clearStoreData, mockInvoke } from "../setupTests";
import { Settings } from "./Settings";

// Mock the store module with a fresh store per test
let mockStore = new FakeStore();
mock.module("@tauri-apps/plugin-store", () => ({
  load: () => Promise.resolve(mockStore),
}));

describe("Settings", () => {
  beforeEach(() => {
    mockStore = new FakeStore();
    clearStoreData();
    global.alert = mock(() => {});
  });

  it("loads settings from backend on mount when store is empty", async () => {
    const backendConfig = {
      microbreakInterval: 180,
      microbreakDuration: 30,
      microbreakEnabled: true,
      restInterval: 2700,
      restDuration: 600,
      restEnabled: true,
      dailyLimit: 28800,
      dailyEnabled: true,
      warningDuration: 30,
      mode: "Normal",
    };

    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === "get_settings") return Promise.resolve(backendConfig);
      return Promise.resolve(null);
    });

    const { baseElement } = render(<Settings />);
    const screen = within(baseElement);

    await waitFor(() => {
      expect(screen.getByDisplayValue("180")).toBeInTheDocument();
      expect(screen.getByDisplayValue("8")).toBeInTheDocument();
    });
  });

  it("persists settings to store when saved", async () => {
    const backendConfig = {
      microbreakInterval: 100,
      microbreakDuration: 20,
      microbreakEnabled: true,
      restInterval: 2000,
      restDuration: 500,
      restEnabled: true,
      dailyLimit: 4000,
      dailyEnabled: false,
      warningDuration: 30,
      mode: "Normal",
    };

    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === "get_settings") return Promise.resolve(backendConfig);
      return Promise.resolve(null);
    });

    const { baseElement } = render(<Settings />);
    const screen = within(baseElement);
    await screen.findByText("Save Settings");

    const form = baseElement.querySelector("form");
    if (form) fireEvent.submit(form);

    await waitFor(async () => {
      const stored = await mockStore.get<typeof backendConfig>("break_config");
      expect(stored).toBeTruthy();
      expect(stored?.microbreakInterval).toBe(100);
    });
  });

  it("loads settings from store on mount if available", async () => {
    const storedConfig = {
      microbreakInterval: 250,
      microbreakDuration: 45,
      microbreakEnabled: true,
      restInterval: 3000,
      restDuration: 700,
      restEnabled: true,
      dailyLimit: 7200,
      dailyEnabled: true,
      warningDuration: 30,
      mode: "Quiet",
    };

    await mockStore.set("break_config", storedConfig);

    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === "get_settings")
        return Promise.resolve({
          ...storedConfig,
          microbreakInterval: 180,
          mode: "Normal",
        });
      return Promise.resolve(null);
    });

    const { baseElement } = render(<Settings />);
    const screen = within(baseElement);

    await waitFor(() => {
      expect(screen.getByDisplayValue("250")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Quiet")).toBeInTheDocument();
      expect(screen.getByDisplayValue("2")).toBeInTheDocument();
    });
  });

  it("has expected layout classes", async () => {
    mockInvoke.mockImplementation(() => Promise.resolve({}));
    const { container } = render(<Settings />);

    await waitFor(() => {
      const grid = container.querySelector('div[class*="md:grid-cols-2"]');
      expect(grid).toBeInTheDocument();
    });
  });

  it("updates mode when 'app-mode-changed' event is received", async () => {
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === "get_settings") {
        return Promise.resolve({ mode: "Normal" });
      }
      return Promise.resolve(null);
    });

    const { baseElement } = render(<Settings />);
    const screen = within(baseElement);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Normal")).toBeInTheDocument();
    });
  });

  it("handles input changes correctly", async () => {
    const backendConfig = {
      microbreakInterval: 180,
      microbreakDuration: 30,
      microbreakEnabled: true,
      restInterval: 2700,
      restDuration: 600,
      restEnabled: true,
      dailyLimit: 28800, // 8 hours
      dailyEnabled: true,
      warningDuration: 30,
      mode: "Normal",
    };

    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === "get_settings") return Promise.resolve(backendConfig);
      // Mock set_mode invoke
      if (cmd === "set_mode") return Promise.resolve(null);
      return Promise.resolve(null);
    });

    const { baseElement } = render(<Settings />);
    const screen = within(baseElement);

    await waitFor(() => {
      expect(screen.getByDisplayValue("180")).toBeInTheDocument();
    });

    // 1. Change number input
    // Use name selector for robustness
    const microInput = baseElement.querySelector('input[name="microbreakInterval"]')!;
    fireEvent.change(microInput, { target: { value: "200" } });
    expect(screen.getByDisplayValue("200")).toBeInTheDocument();

    // 2. Change checkbox (microbreakEnabled)
    const microCheckbox = baseElement.querySelector('input[name="microbreakEnabled"]') as HTMLInputElement;
    fireEvent.click(microCheckbox);
    expect(microCheckbox.checked).toBe(false);

    // 3. Change Daily Limit (special conversion case)
    const dailyInput = baseElement.querySelector('input[name="dailyLimit"]')!;
    // Enter "9" hours
    fireEvent.change(dailyInput, { target: { value: "9" } });
    expect(screen.getByDisplayValue("9")).toBeInTheDocument();

    // 4. Change Mode (should trigger invoke)
    const modeSelect = baseElement.querySelector('select[name="mode"]')!;
    fireEvent.change(modeSelect, { target: { value: "Reading" } });

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("set_mode", { mode: "Reading" });
    });
  });
});
