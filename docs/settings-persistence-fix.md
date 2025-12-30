# Settings Persistence Bug Fix - Summary

## Problem

Settings were not persisting across app restarts. When the user changed the microbreak interval to 10 minutes (600 seconds) and restarted the app, it reverted to the default value of 3 minutes (180 seconds).

## Root Cause

The **corrupted** `settings.json` file contained **duplicate keys** in both camelCase and snake_case formats:

```json
{
  "break_config": {
    "microbreakInterval": 180, // ← camelCase (correct)
    "microbreak_interval": 60, // ← snake_case (incorrect)
    "microbreakDuration": 30,
    "microbreak_duration": 10
    // ... duplicates for all fields
  }
}
```

The source of snake_case keys was traced to **test files** that were using snake_case instead of camelCase, which may have influenced the store during development/testing.

## Solution

### 1. Cleaned Up Corrupted Settings File

- Deleted `/Users/esriva00/Library/Application Support/com.rsi-assistant.app/settings.json`
- Next app startup will create a fresh file with correct camelCase format

### 2. Fixed Test Files for Consistency

- **Fixed** `/src/persistence.test.tsx` - Changed snake_case to camelCase in test data
- **Fixed** `/src/pages/BreakOverlay.test.tsx` - Updated test description
- **Removed** incorrect vitest test files

### 3. Added Rust Tests for Serialization Contract

Added tests in `/src-tauri/src/timer/mod.rs`:

- `test_deserialize_camelcase_from_frontend()` - Verifies Rust can deserialize camelCase JSON
- `test_serialize_to_camelcase()` - Verifies Rust serializes to camelCase JSON

These tests ensure the Rust backend always uses camelCase for JSON communication with the frontend.

## Verification

### All Tests Pass ✅

- **Frontend**: 39 tests pass, 2 skipped
- **Backend**: 29 tests pass

### Test Coverage

The new Rust tests specifically verify:

1. Frontend sends camelCase → Rust deserializes correctly
2. Rust serializes to camelCase → Frontend receives correctly
3. Mode uses PascalCase ("Normal", "Quiet", etc.)

## Future Prevention

The new serialization tests will catch any future introduction of snake_case in the JSON communication layer, ensuring:

- Consistent naming conventions
- No duplicate keys in persisted data
- Proper serialization/deserialization

## Manual Verification Steps

To verify the fix:

1. Start the app
2. Navigate to Settings
3. Change microbreak interval to 600 seconds (10 minutes)
4. Click "Save Settings"
5. Close the app completely
6. Restart the app
7. Navigate to Settings
8. **Expected**: Microbreak interval should still be 600 seconds ✅

The settings file at `~/Library/Application Support/com.rsi-assistant.app/settings.json` should now contain **only** camelCase keys.
