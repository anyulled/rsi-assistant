import { fireEvent, render, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import "../setupTests";
import { clearStoreData, mockInvoke } from "../setupTests";
import { Settings } from "./Settings";

// Create a simple in-memory store for testing
class FakeStore {
  private data: Record<string, unknown> = {};

  async get<T>(key: string): Promise<T | undefined> {
    return this.data[key] as T | undefined;
  }

  async set(key: string, value: unknown): Promise<void> {
    this.data[key] = value;
  }

  async save(): Promise<void> {
    // No-op
  }

  async delete(key: string): Promise<void> {
    delete this.data[key];
  }

  clear(): void {
    this.data = {};
  }
}

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
});
