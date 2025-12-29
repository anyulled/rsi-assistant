import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";
import { afterEach, expect, mock } from "bun:test";
import { Window } from "happy-dom";
import type { BreakConfig, TimerStatus } from "./types";

const window = new Window();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
global.window = window as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
global.document = window.document as any;
global.console = console;
global.requestAnimationFrame = (callback) => setTimeout(callback, 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);
global.getComputedStyle = window.getComputedStyle;

expect.extend(matchers);

// Default timer status for tests
export const DEFAULT_TIMER_STATUS: TimerStatus = {
  dailyUsage: 0,
  dailyLimit: 28800,
  microActive: 0,
  microTarget: 180,
  microIsOverdue: false,
  restActive: 0,
  restTarget: 2700,
  restIsOverdue: false,
  currentIdle: 0,
  mode: "Normal",
  breakType: null,
  breakDuration: 0,
  breakElapsed: 0,
};

// Default break config for tests
export const DEFAULT_BREAK_CONFIG: BreakConfig = {
  microbreakInterval: 180,
  microbreakDuration: 20,
  restInterval: 2700,
  restDuration: 300,
  dailyLimit: 28800,
};

// Store data for tests
const mockStoreData: Record<string, unknown> = {};

// Export store data helpers
export const getStoreData = () => mockStoreData;
export const setStoreData = (key: string, value: unknown) => {
  mockStoreData[key] = value;
};
export const clearStoreData = () => {
  Object.keys(mockStoreData).forEach((key) => delete mockStoreData[key]);
};

// Window label for testing
let _windowLabel = "main";
export const setWindowLabel = (label: string) => {
  _windowLabel = label;
};
export const getWindowLabel = () => _windowLabel;

// Mock functions
export const mockInvoke = mock((cmd: string, _args?: unknown) => {
  switch (cmd) {
    case "get_timer_state":
      return Promise.resolve(DEFAULT_TIMER_STATUS);
    case "get_settings":
      return Promise.resolve(DEFAULT_BREAK_CONFIG);
    default:
      return Promise.resolve(null);
  }
});

export const mockListen = mock(() => Promise.resolve(() => {}));
export const mockEmit = mock(() => Promise.resolve());
export const mockGetCurrentWindow = mock(() => ({
  label: _windowLabel,
  hide: mock(() => Promise.resolve()),
  show: mock(() => Promise.resolve()),
}));

// Mock Tauri APIs
mock.module("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...(args as [string, unknown?])),
}));

mock.module("@tauri-apps/api/event", () => ({
  listen: (...args: unknown[]) => mockListen(...(args as [])),
  emit: (...args: unknown[]) => mockEmit(...(args as [])),
}));

mock.module("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => mockGetCurrentWindow(),
}));

// Mock Tauri Store plugin
mock.module("@tauri-apps/plugin-store", () => ({
  load: mock(() =>
    Promise.resolve({
      get: mock((key: string) => Promise.resolve(mockStoreData[key])),
      set: mock((key: string, value: unknown) => {
        mockStoreData[key] = value;
        return Promise.resolve();
      }),
      save: mock(() => Promise.resolve()),
      delete: mock((key: string) => {
        delete mockStoreData[key];
        return Promise.resolve();
      }),
    })
  ),
}));

afterEach(() => {
  cleanup();
  // Reset mock call history AND implementation
  mockInvoke.mockReset();
  mockListen.mockReset();
  mockEmit.mockReset();
  mockGetCurrentWindow.mockReset();

  // Restore default implementations
  mockInvoke.mockImplementation((cmd: string, _args?: unknown) => {
    switch (cmd) {
      case "get_timer_state":
        return Promise.resolve(DEFAULT_TIMER_STATUS);
      case "get_settings":
        return Promise.resolve(DEFAULT_BREAK_CONFIG);
      default:
        return Promise.resolve(null);
    }
  });

  mockListen.mockImplementation(() => Promise.resolve(() => {}));
  mockEmit.mockImplementation(() => Promise.resolve());
  mockGetCurrentWindow.mockImplementation(() => ({
    label: _windowLabel,
    hide: mock(() => Promise.resolve()),
    show: mock(() => Promise.resolve()),
  }));

  // Reset window label
  _windowLabel = "main";
  // Reset store data
  clearStoreData();
});
