import { invoke } from "@tauri-apps/api/core";
import { load } from "@tauri-apps/plugin-store";
import { fireEvent, render, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import "../setupTests";
import { FakeStore } from "../testUtils";
import { Settings } from "./Settings";

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
      expect(stored.microbreakInterval).toBe(100);
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
      dailyLimit: 7200, // 2 hours
      dailyEnabled: true,
      warningDuration: 30,
      mode: "Quiet",
    };

    await mockStore.set("break_config", storedConfig);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (invoke as any).mockImplementation((cmd: string) => {
      // Backend has defaults
      if (cmd === "get_settings")
        return Promise.resolve({
          ...storedConfig,
          microbreakInterval: 180,
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

  it("updates mode when 'app-mode-changed' event is received", async () => {
    // 1. Setup mock to capture the event listener callback
    let eventCallback: ((event: { payload: string }) => void) | undefined;

    // We need to remock listen for this specific test
    const { listen } = await import("@tauri-apps/api/event");

    type MockImpl = (event: string, cb: (event: { payload: string }) => void) => Promise<() => void>;
    type MockListen = { mockImplementation: (impl: MockImpl) => void };

    (listen as unknown as MockListen).mockImplementation((event, cb) => {
      if (event === "app-mode-changed") {
        eventCallback = cb;
      }
      return Promise.resolve(() => {});
    });

    // 2. Render component
    const { baseElement } = render(<Settings />);
    const screen = within(baseElement);

    // Initial load finishes
    await waitFor(() => {
      expect(screen.getByDisplayValue("Normal")).toBeInTheDocument();
    });

    // 3. Verify listener was registered
    expect(eventCallback).toBeDefined();

    // 4. Simulate event
    if (eventCallback) eventCallback({ payload: "Reading" });

    // 5. Assert mode updated to "Reading"
    await waitFor(() => {
      const modeSelect = screen.getByDisplayValue("Reading") as HTMLSelectElement;
      expect(modeSelect).toBeInTheDocument();
      expect(modeSelect.value).toBe("Reading");
    });
  });
});
