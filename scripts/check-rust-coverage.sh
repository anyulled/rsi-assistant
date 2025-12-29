#!/usr/bin/env bash
set -e

# Rust Coverage Check Script
# This script runs Rust tests with coverage and enforces an 80% threshold

cd src-tauri

echo "Running Rust tests with coverage..."

# Run coverage once and capture output (this also runs tests)
COVERAGE_OUTPUT=$(cargo llvm-cov --all-features --workspace 2>&1)
echo "$COVERAGE_OUTPUT"

echo ""
echo "Extracting coverage percentage..."

# Extract coverage from TOTAL line, using the first percentage found
# Format: TOTAL [regions]  X.XX%  [functions]  Y.YY%  [lines]  Z.ZZ%
COVERAGE=$(echo "$COVERAGE_OUTPUT" | grep "TOTAL" | grep -o '[0-9]\+\.[0-9]\+%' | head -1 | sed 's/%//')
echo "Rust coverage: ${COVERAGE}%"

if [ -z "$COVERAGE" ]; then
  echo "❌ Could not parse coverage output"
  exit 1
fi

# Pure bash integer comparison (convert to integer by removing decimal)
COVERAGE_INT=${COVERAGE%.*}
echo "Coverage as integer: $COVERAGE_INT"

if [ "$COVERAGE_INT" -lt 80 ]; then
  echo "❌ Rust coverage (${COVERAGE}%) is below 80% threshold"
  exit 1
fi

echo "✅ Rust coverage (${COVERAGE}%) meets 80% threshold"
