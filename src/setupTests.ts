import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";
import { afterEach, expect, mock } from "bun:test";
import { Window } from "happy-dom";
import {
  clearStoreData,
  getDefaultBreakConfig,
  getDefaultTimerStatus,
  getStoreData,
  getWindowLabel,
  mockEmit,
  mockGetCurrentWindow,
  mockInvoke,
  mockListen,
  setWindowLabel,
} from "./testUtils";

// Re-export everything from testUtils for backward compatibility
export * from "./testUtils";

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
  load: mock(() => {
    const data = getStoreData();
    return Promise.resolve({
      get: mock((key: string) => Promise.resolve(data[key])),
      set: mock((key: string, value: unknown) => {
        data[key] = value;
        return Promise.resolve();
      }),
      save: mock(() => Promise.resolve()),
      delete: mock((key: string) => {
        delete data[key];
        return Promise.resolve();
      }),
    });
  }),
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
        // Return a fresh new object effectively
        return Promise.resolve(getDefaultTimerStatus());
      case "get_settings":
        return Promise.resolve(getDefaultBreakConfig());
      default:
        return Promise.resolve(null);
    }
  });

  mockListen.mockImplementation(() => Promise.resolve(() => {}));
  mockEmit.mockImplementation(() => Promise.resolve());

  // Need to recreate the return generic object since mockGetCurrentWindow is a mock function that returns an object
  // But wait, the original definition in testUtils creates the object.
  // We can just rely on the default implementation if we don't mockImplementation.
  // However, mockReset() clears the implementation of the mock function itself.
  // So we MUST restore it.

  mockGetCurrentWindow.mockImplementation(() => ({
    label: getWindowLabel(),
    hide: mock(() => Promise.resolve()),
    show: mock(() => Promise.resolve()),
  }));

  // Reset window label
  setWindowLabel("main");
  // Reset store data
  clearStoreData();
});
