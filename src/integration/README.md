# Integration Testing

This directory contains integration tests that verify the TypeScript/Rust boundary.

## Running Integration Tests

Integration tests require the Tauri app to be running:

```bash
# Terminal 1: Start Tauri dev server
bun run tauri dev

# Terminal 2: Run integration tests
bun test src/integration/
```

## What These Tests Verify

1. **Field Naming**: Ensures Rust snake_case fields are properly converted to TypeScript camelCase
2. **Type Compatibility**: Verifies all fields have correct types (number, boolean, string, etc.)
3. **Command Signatures**: Tests that Tauri commands accept and return expected data structures
4. **Error Handling**: Validates that invalid inputs are properly rejected

## Adding New Tests

When adding new Tauri commands:

1. Define the TypeScript interface matching the Rust struct
2. Add tests verifying all fields exist and have correct types
3. Test both success and error cases
4. Verify field naming convention (camelCase in TS, snake_case in Rust)
