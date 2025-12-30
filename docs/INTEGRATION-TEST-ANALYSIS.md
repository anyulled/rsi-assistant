# Integration Test Analysis for RSI Assistant

## Executive Summary

**Current Status**: ⚠️ **Moderate Coverage with Critical Gaps**

The project has good **unit test coverage** but **weak integration test coverage** for frontend-backend communication. While individual commands are tested, there's no proper end-to-end testing of the serialization/deserialization layer that caused the recent persistence bug.

---

## Current Test Inventory

### Backend (Rust) Tests

#### ✅ **commands.rs** (Unit Tests)

- **Location**: `src-tauri/src/commands.rs` (lines 168-314)
- **Coverage**: 14 unit tests
- **What's Tested**:
  - Individual command logic (`_impl` functions)
  - State management
  - Error cases
  - Breaking business logic

**Strengths**:

- Good coverage of command logic
- Tests individual functions in isolation
- Covers error paths

**Weaknesses**:

- ❌ **Does NOT test serialization/deserialization**
- ❌ **Does NOT test the `#[tauri::command]` layer**
- ❌ **Does NOT test JSON conversion (serde)**
- ❌ **Does NOT test camelCase ↔ snake_case conversion**

#### ✅ **commands_test.rs** (Integration Tests)

- **Location**: `src-tauri/src/commands_test.rs`
- **Coverage**: 12 tests
- **What's Tested**:
  - Full command calls through `tauri::State`
  - State mutations
  - Multi-step workflows

**Strengths**:

- Tests commands through the state layer
- Tests realistic workflows

**Weaknesses**:

- ❌ **Still doesn't test JSON serialization**
- ❌ **Doesn't use actual Tauri command invocation**
- ❌ **Doesn't test IPC layer**

#### ✅ **timer/mod.rs** (Unit + Serialization Tests)

- **Location**: `src-tauri/src/timer/mod.rs`
- **Coverage**: 29 tests
- **What's Tested**:
  - Timer logic
  - **NEW**: `test_deserialize_camelcase_from_frontend()` ✅
  - **NEW**: `test_serialize_to_camelcase()` ✅

**Strengths**:

- Excellent timer logic coverage
- **Tests JSON serialization format** (added today)
- Validates camelCase convention

**Weaknesses**:

- Only tests BreakConfig struct
- Doesn't test TimerStatus serialization

### Frontend (TypeScript) Tests

#### ⚠️ **persistence.test.tsx** (Weak Integration Test)

- **Location**: `src/persistence.test.tsx`
- **Coverage**: 1 test
- **What's Tested**:
  - Settings sync on app startup
  - Store → `update_settings` call

**Strengths**:

- Tests the critical persistence flow

**Weaknesses**:

- ❌ **Uses mocks, not real Tauri commands**
- ❌ **Doesn't verify backend receives correct format**
- ❌ **Doesn't test round-trip serialization**
- ❌ **Only tests one scenario**

#### ✅ **Component Tests** (App.test.tsx, Settings.test.tsx, etc.)

- **Coverage**: ~10 test files, 39 passing tests
- **What's Tested**:
  - UI rendering
  - User interactions
  - Component state

**Strengths**:

- Good UI coverage

**Weaknesses**:

- All use mocks
- Don't test actual IPC

---

## Critical Gaps

### 🚨 **Gap #1: No JSON Serialization Integration Tests**

**Problem**: The recent settings persistence bug was caused by snake_case in JSON. Our unit tests didn't catch it because they don't test the full serialization layer.

**Missing**:

- Tests that send actual JSON from "frontend" to Rust deserializer
- Tests that verify Rust serializes back to camelCase JSON
- Round-trip tests (JSON → Rust → JSON)

### 🚨 **Gap #2: No TimerStatus Serialization Tests**

**Problem**: We added tests for `BreakConfig`, but `TimerStatus` is also serialized and sent to frontend.

**Missing**:

```rust
#[test]
fn test_timer_status_serialization() {
    let status = TimerStatus { /* ... */ };
    let json = serde_json::to_string(&status).unwrap();
    assert!(json.contains("\"microActive\""));  // camelCase
    assert!(!json.contains("micro_active"));   // NOT snake_case
}
```

### 🚨 **Gap #3: No Contract Tests**

**Problem**: No tests verify the frontend-backend contract matches.

**Missing**:

- Tests that TypeScript types match Rust types
- Tests that validate all commands can serialize their return types
- Tests that verify command names match between frontend and backend

### 🚨 **Gap #4: No End-to-End Command Tests**

**Problem**: Commands are tested in isolation, not through the actual Tauri IPC layer.

**Missing**:

- Tests using Tauri's test harness
- Tests that actually invoke commands through IPC
- Tests that validate the complete request/response cycle

---

## Best Practices from Tauri/Rust Community

### ✅ **What We're Doing Right**

1. **Separate `_impl` functions** - Allows testing without Tauri state
2. **Comprehensive unit tests** - Good coverage of business logic
3. **Using serde with `rename_all`** - Standard Rust<->JS interop pattern
4. **Property-based tests would help** - But not critical for this app

### ❌ **What We're Missing**

According to Tauri best practices:

1. **Tauri Test Harness** - Tauri provides testing utilities we're not using
2. **Contract Testing** - Should validate TypeScript ↔ Rust contracts
3. **Serialization Tests** - Every serialized struct should have tests
4. **Integration Tests in `tests/` directory** - Rust convention (we have some in src)

---

## Recommendations (Prioritized)

### 🔴 **CRITICAL (Do Now)**

#### 1. Add Serialization Contract Tests for All Commands

Create `src-tauri/src/serialization_tests.rs`:

```rust
#[cfg(test)]
mod serialization_integration_tests {
    use super::*;
    use serde_json;

    #[test]
    fn test_all_commands_serialize_to_camelcase() {
        // Test BreakConfig (already exists, duplicate for completeness)
        let config = BreakConfig::default();
        let json = serde_json::to_string(&config).unwrap();
        assert!(json.contains("\"microbreakInterval\""));
        assert!(!json.contains("\"microbreak_interval\""));

        // Test TimerStatus
        let status = create_test_timer_status();
        let json = serde_json::to_string(&status).unwrap();
        assert!(json.contains("\"microActive\""));
        assert!(json.contains("\"dailyUsage\""));
        assert!(!json.contains("\"micro_active\""));

        // Test DailyStats
        let stats = DailyStats::default();
        let json = serde_json::to_string(&stats).unwrap();
        // Verify camelCase
    }

    #[test]
    fn test_all_commands_deserialize_from_camelcase() {
        // Test incoming data from frontend
        let json = r#"{
            "microbreakInterval": 600,
            "microbreakDuration": 30,
            "mode": "Normal"
        }"#;

        let result: Result<BreakConfig, _> = serde_json::from_str(json);
        assert!(result.is_ok());
        let config = result.unwrap();
        assert_eq!(config.microbreak_interval, 600);
    }

    #[test]
    fn test_round_trip_serialization() {
        // Frontend → Rust → Frontend
        let original = BreakConfig {
            microbreak_interval: 600,
            mode: OperationMode::Quiet,
            // ...
        };

        let json = serde_json::to_string(&original).unwrap();
        let deserialized: BreakConfig = serde_json::from_str(&json).unwrap();

        assert_eq!(original.microbreak_interval, deserialized.microbreak_interval);
        assert_eq!(original.mode, deserialized.mode);
    }
}
```

#### 2. Add TimerStatus Serialization Tests

Add to `src-tauri/src/timer/mod.rs`:

```rust
#[test]
fn test_timer_status_serialization_contract() {
    let status = TimerStatus {
        daily_usage: 100,
        daily_limit: 28800,
        micro_active: 50,
        // ... all fields
    };

    let json = serde_json::to_string_pretty(&status).unwrap();

    // Verify camelCase
    assert!(json.contains("\"dailyUsage\""));
    assert!(json.contains("\"microActive\""));
    assert!(json.contains("\"breakType\""));

    // Verify NOT snake_case
    assert!(!json.contains("\"daily_usage\""));
    assert!(!json.contains("\"micro_active\""));
}
```

### 🟡 **HIGH PRIORITY (Do Soon)**

#### 3. Add Frontend Integration Tests Using Real Tauri Mocks

Convert `persistence.test.tsx` to use `@tauri-apps/api/mocks`:

```typescript
import { mockIPC, clearMocks } from "@tauri-apps/api/mocks";
import { invoke } from "@tauri-apps/api/core";

describe("Settings Persistence Integration", () => {
  afterEach(() => clearMocks());

  it("persists settings with correct camelCase format", async () => {
    let receivedPayload: any;

    mockIPC((cmd, payload) => {
      if (cmd === "update_settings") {
        receivedPayload = payload;
        return null;
      }
    });

    await invoke("update_settings", {
      settings: {
        microbreakInterval: 600,
        microbreakDuration: 30,
        mode: "Normal",
      },
    });

    // Verify the mock received camelCase
    expect(receivedPayload.settings.microbreakInterval).toBe(600);
    expect(receivedPayload.settings).not.toHaveProperty("microbreak_interval");
  });
});
```

#### 4. Add Command Name Validation Test

```rust
#[test]
fn test_command_names_match_frontend() {
    // This is a compile check more than runtime,
    // but documents the contract
    let _commands = vec![
        "get_timer_state",
        "get_settings",
        "update_settings",
        "get_statistics",
        "record_break_taken",
        "record_break_postponed",
        "reset_break",
        "set_mode",
        "trigger_break",
    ];

    // Could grep frontend code to verify these exist
}
```

### 🟢 **NICE TO HAVE (Do Later)**

1. **Property-based Testing** (using `proptest`)
   - Generate random valid configs
   - Verify serialization always works

2. **Tauri Test Harness** (requires more setup)
   - Use actual Tauri test runner
   - Test through real IPC

3. **Coverage Reports**
   - Use `tarpaulin` for Rust coverage
   - Track serialization test coverage separately

---

## Implementation Plan

### Phase 1: Critical Serialization Tests (Today)

- [ ] Add `TimerStatus` serialization test
- [ ] Add `DailyStats` serialization test
- [ ] Add round-trip test for `BreakConfig`
- [ ] Run all tests and verify they pass

### Phase 2: Integration Tests (This Week)

- [ ] Convert `persistence.test.tsx` to use `@tauri-apps/api/mocks`
- [ ] Add test for each command's serialization
- [ ] Add frontend test for `get_statistics` response format
- [ ] Add frontend test for `get_timer_state` response format

### Phase 3: Documentation (This Week)

- [ ] Document serialization testing requirements
- [ ] Add to TESTING.md
- [ ] Create example integration test template
- [ ] Update PR checklist to include serialization tests

---

## Success Metrics

After implementing these tests, we should have:

- ✅ 100% of serialized structs have serialization tests
- ✅ All commands have contract tests
- ✅ Frontend tests use `@tauri-apps/api/mocks` for IPC
- ✅ No snake_case in JSON (enforced by tests)
- ✅ Round-trip serialization tested
- ✅ CI catches serialization bugs before merge

**This will prevent bugs like the settings persistence issue from ever happening again.** 🎯
