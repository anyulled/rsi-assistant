import { Window } from 'happy-dom';
import { expect, afterEach, mock } from "bun:test";
import { cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";

const window = new Window();
global.window = window as any;
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

afterEach(() => {
    cleanup();
});
