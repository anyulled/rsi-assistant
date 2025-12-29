import { mock } from "bun:test";
import type { BreakConfig, TimerStatus } from "./types";

export class FakeStore {
  private data: Map<string, unknown> = new Map();

  constructor(initialData: Record<string, unknown> = {}) {
    Object.entries(initialData).forEach(([key, value]) => {
      this.data.set(key, value);
    });
  }

  get<T>(key: string): Promise<T | null> {
    return Promise.resolve((this.data.get(key) as T) ?? null);
  }

  set(key: string, value: unknown): Promise<void> {
    this.data.set(key, value);
    return Promise.resolve();
  }

  save(): Promise<void> {
    return Promise.resolve();
  }

  delete(key: string): Promise<void> {
    this.data.delete(key);
    return Promise.resolve();
  }

  clear(): void {
    this.data.clear();
  }
}

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
  microbreakEnabled: false,
  restEnabled: false,
  dailyEnabled: false,
  warningDuration: 0,
  mode: "Normal",
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
