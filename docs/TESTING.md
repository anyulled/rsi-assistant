# RSI Assistant - Testing Guide

## Frontend Testing Framework

### Tool Stack

- **Framework**: Bun Test (NOT Vitest, NOT Jest standalone)
- **Test Runner**: `bun test --preload ./src/setupTests.ts`
- **Coverage**: `bun test --preload ./src/setupTests.ts --coverage`
- **DOM Testing**: @testing-library/react with happy-dom

### Required Imports for Test Files

```typescript
import { describe, it, expect, beforeEach, mock } from "bun:test";
import { render, fireEvent, waitFor, within } from "@testing-library/react";
import "../setupTests"; // or "./setupTests" depending on directory
import { mockInvoke, setWindowLabel, clearStoreData, setStoreData } from "../setupTests";
```

### Tauri Official Mocking Library (Preferred for New Tests)

For new tests, **prefer using Tauri's official mocking library** `@tauri-apps/api/mocks`:

```typescript
import { mockIPC, mockWindows, clearMocks } from "@tauri-apps/api/mocks";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen, emit } from "@tauri-apps/api/event";
```

#### Why Use `@tauri-apps/api/mocks`?

- ✅ **Official Tauri tooling** - Maintained by the Tauri team
- ✅ **Type-safe** - Full TypeScript support
- ✅ **Comprehensive** - Mocks IPC calls, windows, events, and file sources
- ✅ **Cleaner tests** - Less boilerplate than custom mocks

#### Basic Usage

**Mocking IPC Commands:**

```typescript
import { mockIPC, clearMocks } from "@tauri-apps/api/mocks";
import { invoke } from "@tauri-apps/api/core";

describe("Component with IPC", () => {
  afterEach(() => {
    clearMocks(); // Clean up after each test
  });

  it("calls backend command", async () => {
    // Mock the IPC handler
    mockIPC((cmd, payload) => {
      if (cmd === "get_settings") {
        return {
          microbreakInterval: 600,
          microbreakDuration: 30,
          microbreakEnabled: true,
          // ... rest of config
        };
      }
      return null;
    });

    const result = await invoke("get_settings");
    expect(result.microbreakInterval).toBe(600);
  });
});
```

**Mocking Windows:**

```typescript
import { mockWindows } from "@tauri-apps/api/mocks";
import { getCurrentWindow } from "@tauri-apps/api/window";

describe("Window-specific behavior", () => {
  it("identifies overlay window", () => {
    mockWindows("overlay"); // Set current window label

    const win = getCurrentWindow();
    expect(win.label).toBe("overlay");
  });
});
```

**Mocking Events (opt-in):**

```typescript
import { mockIPC, clearMocks } from "@tauri-apps/api/mocks";
import { listen, emit } from "@tauri-apps/api/event";

describe("Event handling", () => {
  afterEach(() => {
    clearMocks();
  });

  it("handles custom events", async () => {
    // Enable event mocking
    mockIPC(() => {}, { shouldMockEvents: true });

    const eventHandler = mock(() => {});
    await listen("app-mode-changed", eventHandler);

    await emit("app-mode-changed", "Quiet");

    expect(eventHandler).toHaveBeenCalledWith({
      event: "app-mode-changed",
      payload: "Quiet",
    });
  });
});
```

#### When to Use Custom Mocks vs `@tauri-apps/api/mocks`

**Use `@tauri-apps/api/mocks` when:**

- ✅ Writing new tests
- ✅ Testing individual components in isolation
- ✅ Need to mock specific IPC commands
- ✅ Need to simulate different window contexts

**Use existing custom mocks (`setupTests.ts`) when:**

- ✅ Running integration tests that need global state
- ✅ Tests already use the custom mock infrastructure
- ✅ Need to share mock state across multiple components

### Standard Test Pattern

```typescript
describe("ComponentName", () => {
  beforeEach(() => {
    // Reset state before each test
    clearStoreData();
    setWindowLabel("main");
  });

  it("describes what it tests", async () => {
    // Arrange - Set up mocks
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === "get_timer_state") {
        return Promise.resolve({
          mode: "Normal",
          microActive: 0,
          microTarget: 100,
          // ... complete TimerStatus object
        });
      }
      return Promise.resolve(null);
    });

    // Act - Render component
    const { baseElement } = render(<Component />);
    const screen = within(baseElement);

    // Assert - Verify behavior
    await waitFor(() => {
      expect(screen.getByText("Expected Text")).toBeInTheDocument();
    });
  });
});
```

### Reference Test Files

- **App component**: `/src/App.test.tsx`
- **Settings page**: `/src/pages/Settings.test.tsx`
- **Break overlay**: `/src/pages/BreakOverlay.test.tsx`
- **Persistence**: `/src/persistence.test.tsx`
- **Hooks**: `/src/hooks/useTimer.test.ts`

## Backend Testing Framework

### Tool Stack

- **Framework**: Rust built-in test framework
- **Test Runner**: `cargo test --manifest-path=src-tauri/Cargo.toml --lib`
- **Location**: Tests in `#[cfg(test)] mod tests { }` blocks

### Standard Test Pattern

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_descriptive_name() {
        // Arrange
        let config = BreakConfig::default();
        let mut service = TimerService::new(config);

        // Act
        service.tick(false);

        // Assert
        assert_eq!(service.micro_active, 1);
    }

    #[test]
    fn test_serialization() {
        let json = r#"{"microbreakInterval": 600}"#;
        let result: BreakConfig = serde_json::from_str(json).unwrap();
        assert_eq!(result.microbreak_interval, 600);
    }
}
```

### Reference Test Files

- **Timer logic**: `/src-tauri/src/timer/mod.rs` (tests at bottom)
- **Commands**: `/src-tauri/src/commands_test.rs`
- **Stats**: `/src-tauri/src/stats/mod.rs`

## Naming Conventions (CRITICAL)

### TypeScript/JSON → Rust Communication

| Layer                 | Convention            | Example                              |
| --------------------- | --------------------- | ------------------------------------ |
| TypeScript interfaces | camelCase             | `microbreakInterval`, `restDuration` |
| JSON in tests         | camelCase             | `{"microbreakInterval": 600}`        |
| Rust struct fields    | snake_case            | `microbreak_interval`                |
| Rust serialization    | camelCase (via serde) | `#[serde(rename_all = "camelCase")]` |
| Operation modes       | PascalCase            | `"Normal"`, `"Quiet"`, `"Suspended"` |

### WHY This Matters

The Rust backend has `#[serde(rename_all = "camelCase")]` on all structs that communicate with the frontend. This means:

- ✅ Frontend sends: `{"microbreakInterval": 600}`
- ✅ Rust deserializes to: `microbreak_interval: 600`
- ✅ Rust serializes to: `{"microbreakInterval": 600}`

If you use snake_case in test JSON, it will fail to deserialize and fall back to defaults!

## Common Mistakes to Avoid

### ❌ DON'T: Use wrong test framework

```typescript
import { describe, it, expect } from "vitest"; // WRONG! This project uses Bun
```

### ✅ DO: Use Bun test framework

```typescript
import { describe, it, expect } from "bun:test"; // CORRECT
```

### ❌ DON'T: Use snake_case in TypeScript test data

```typescript
const config = {
  microbreak_interval: 600, // WRONG! Will cause persistence bugs
  rest_duration: 300,
};
```

### ✅ DO: Use camelCase in TypeScript test data

```typescript
const config = {
  microbreakInterval: 600, // CORRECT
  restDuration: 300,
};
```

### ❌ DON'T: Forget the preload flag

```bash
bun test  # WRONG! Tests will fail
```

### ✅ DO: Include the setupTests preload

```bash
bun test --preload ./src/setupTests.ts  # CORRECT
```

### ❌ DON'T: Use incomplete mock data

```typescript
mockInvoke.mockImplementation(() => {
  return Promise.resolve({ mode: "Normal" }); // WRONG! Missing required fields
});
```

### ✅ DO: Use complete type-safe mock data

```typescript
mockInvoke.mockImplementation((cmd: string) => {
  if (cmd === "get_timer_state") {
    return Promise.resolve({
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
    }); // CORRECT - complete TimerStatus
  }
  return Promise.resolve(null);
});
```

## Running Tests

### Frontend Tests

```bash
# Run all tests
bun test --preload ./src/setupTests.ts

# Run specific test file
bun test src/pages/Settings.test.tsx --preload ./src/setupTests.ts

# Run with coverage
bun test --preload ./src/setupTests.ts --coverage

# Watch mode (if needed)
bun test --preload ./src/setupTests.ts --watch
```

### Backend Tests

```bash
# Run all tests
cargo test --manifest-path=src-tauri/Cargo.toml --lib

# Run specific test
cargo test --manifest-path=src-tauri/Cargo.toml test_name --lib

# Run with output
cargo test --manifest-path=src-tauri/Cargo.toml --lib -- --nocapture
```

## Quick Checklist for New Tests

Before creating a test file, verify:

- [ ] Import from `"bun:test"` (NOT vitest)
- [ ] Import `"./setupTests"` or `"../setupTests"`
- [ ] Use `beforeEach()` to reset state
- [ ] Use camelCase for all JSON test data
- [ ] Use complete mock objects (check types)
- [ ] Run with `--preload ./src/setupTests.ts`

## Additional Resources

- Package.json test scripts: See `/package.json` lines 74-75
- Test setup: `/src/setupTests.ts`
- Test utilities: `/src/testUtils.ts`
- Type definitions: `/src/types.ts`
