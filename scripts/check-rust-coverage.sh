#!/usr/bin/env bash
set -euo pipefail

# Navigate to project root (parent of scripts directory)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/.."
cd "$PROJECT_ROOT"

# Rust Coverage Check Script
# This script runs Rust tests with coverage and enforces an 80% threshold

# Check if cargo-llvm-cov is installed
if ! command -v cargo-llvm-cov &> /dev/null; then
  echo "❌ cargo-llvm-cov is not installed"
  echo ""
  echo "To install it, run:"
  echo "  cargo install cargo-llvm-cov"
  echo ""
  echo "This tool is required to run Rust code coverage."
  exit 1
fi

cd src-tauri

echo "Running Rust tests with coverage..."

# Run coverage once and capture output (this also runs tests)
# Don't use set -e here so we can capture the output even if it fails
set +e
COVERAGE_OUTPUT=$(cargo llvm-cov --all-features --workspace 2>&1)
COVERAGE_EXIT_CODE=$?
set -e

if [ $COVERAGE_EXIT_CODE -ne 0 ]; then
  echo "$COVERAGE_OUTPUT"
  echo ""
  echo "❌ cargo llvm-cov failed with exit code $COVERAGE_EXIT_CODE"
  exit $COVERAGE_EXIT_CODE
fi

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
