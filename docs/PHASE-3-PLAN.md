# Phase 3 Implementation Plan

## Objectives

1. Add property-based testing with `proptest`
2. Set up code coverage tracking
3. Improve test automation

## 1. Property-Based Testing with Proptest

### What is Property-Based Testing?

Instead of testing specific examples, we generate hundreds/thousands of random valid inputs and verify invariants always hold true.

### Benefits

- Finds edge cases we wouldn't think of
- Tests behavior, not just examples
- Automatic input shrinking (finds minimal failing case)

### Implementation

#### Add proptest dependency

```toml
# In src-tauri/Cargo.toml
[dev-dependencies]
proptest = "1.5"
```

#### Example Properties to Test

1. **Serialization Round-Trip**: Any BreakConfig serializes → deserializes without data loss
2. **Valid Ranges**: All timing fields remain positive after operations
3. **Mode Persistence**: Setting mode always succeeds for valid modes
4. **Stats Accumulation**: Adding breaks never decreases counters

### Tests to Add

- `src-tauri/src/timer/proptest.rs` - Config validation
- `src-tauri/src/stats/proptest.rs` - Stats accumulation invariants

## 2. Code Coverage with Tarpaulin

### Frontend Coverage (Bun)

```bash
bun test --coverage --preload ./src/setupTests.ts
```

Target: 80% coverage

### Backend Coverage (Tarpaulin)

```bash
cargo install cargo-tarpaulin
cargo tarpaulin --out Html --output-dir coverage
```

Target: 80% coverage

### CI Integration

Add coverage reports to GitHub Actions workflow.

## 3. Test Automation Improvements

### VSCode Test Integration

- Add test runner configurations
- Enable debugging tests
- Quick test selection

### Test Organization

- Split integration tests into `src-tauri/tests/`
- Add test helpers module
- Document test patterns

## Success Metrics

- ✅ Property-based tests find at least one edge case
- ✅ Backend coverage ≥ 80%
- ✅ Frontend coverage ≥ 80%
- ✅ Tests run in CI on every PR
- ✅ Coverage reports visible in PRs

## Timeline

- Property tests: 1-2 hours
- Coverage setup: 30 minutes
- Documentation: 30 minutes

Total: ~3 hours
