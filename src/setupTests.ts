import { Window } from "happy-dom";
import { expect, afterEach, mock } from "bun:test";
import { cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";

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
  invoke: mock(() => Promise.resolve()),
}));

mock.module("@tauri-apps/api/window", () => ({
  getCurrentWindow: mock(() => ({
    hide: mock(() => Promise.resolve()),
    show: mock(() => Promise.resolve()),
    label: "main",
  })),
}));

mock.module("@tauri-apps/api/event", () => ({
  listen: mock(() => Promise.resolve(() => { })),
  emit: mock(() => Promise.resolve()),
}));

// Mock Tauri Store plugin
const mockStoreData: Record<string, unknown> = {};
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
});
