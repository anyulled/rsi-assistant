# Migrating from Custom Mocks to @tauri-apps/api/mocks

## Before (Custom Mocks)

```typescript
import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "bun:test";
import App from "./App";
import "./setupTests";
import { mockInvoke, setWindowLabel } from "./setupTests";

describe("App", () => {
  beforeEach(() => {
    setWindowLabel("main");
  });

  it("renders Timer view", async () => {
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === "get_timer_state") {
        return Promise.resolve({
          mode: "Normal",
          microActive: 0,
          microTarget: 100,
          // ... rest of fields
        });
      }
      return Promise.resolve(null);
    });

    const { getByText } = render(<App />);
    await waitFor(() => {
      expect(getByText(/Mode:/)).toBeInTheDocument();
    });
  });
});
```

## After (@tauri-apps/api/mocks)

```typescript
import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mockIPC, mockWindows, clearMocks } from "@tauri-apps/api/mocks";
import App from "./App";

describe("App", () => {
  beforeEach(() => {
    mockWindows("main"); // Set window context
  });

  afterEach(() => {
    clearMocks(); // Clean up
  });

  it("renders Timer view", async () => {
    // Mock IPC handler
    mockIPC((cmd) => {
      if (cmd === "get_timer_state") {
        return {
          mode: "Normal",
          microActive: 0,
          microTarget: 100,
          microIsOverdue: false,
          restActive: 0,
          restTarget: 1000,
          restIsOverdue: false,
          dailyUsage: 0,
          dailyLimit: 28800,
          currentIdle: 0,
          breakType: null,
          breakDuration: 0,
          breakElapsed: 0,
        };
      }
      return null;
    });

    const { getByText } = render(<App />);
    await waitFor(() => {
      expect(getByText(/Mode:/)).toBeInTheDocument();
    });
  });
});
```

## Key Differences

### Benefits of @tauri-apps/api/mocks

1. **No custom setup needed** - Works out of the box
2. **Official API** - Maintained by Tauri team
3. **Better TypeScript support** - Full type inference
4. **Cleaner code** - Less boilerplate

### Migration Steps

1. Replace `import { mockInvoke, setWindowLabel } from "./setupTests"`
   → `import { mockIPC, mockWindows, clearMocks } from "@tauri-apps/api/mocks"`
2. Replace `setWindowLabel("main")`
   → `mockWindows("main")`
3. Replace `mockInvoke.mockImplementation((cmd: string) => {...})`
   → `mockIPC((cmd) => {...})`
4. Add `afterEach(() => { clearMocks(); })`
5. Return values directly (no `Promise.resolve()` needed)

## Event Mocking Example

### Before (Custom Mocks)

```typescript
mockListen.mockImplementation(async (event, handler) => {
  if (event === "app-mode-changed") {
    // Custom event handling logic
  }
});
```

### After (@tauri-apps/api/mocks)

```typescript
import { mockIPC, clearMocks } from "@tauri-apps/api/mocks";
import { listen, emit } from "@tauri-apps/api/event";

mockIPC(() => {}, { shouldMockEvents: true });

const handler = mock(() => {});
await listen("app-mode-changed", handler);
await emit("app-mode-changed", "Quiet");

expect(handler).toHaveBeenCalledWith({
  event: "app-mode-changed",
  payload: "Quiet",
});
```

## When NOT to Migrate

Keep custom mocks (`setupTests.ts`) when:

- Test needs global state shared across components
- Test is an integration test with complex setup
- Multiple components need synchronized mock state
- The test already works well and doesn't need changes
