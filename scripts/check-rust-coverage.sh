#!/usr/bin/env bash
set -euo pipefail

# Trap errors and interruptions for better error messages
trap 'echo ""; echo "❌ Script interrupted or failed at line $LINENO"; exit 130' INT TERM
trap 'echo ""; echo "❌ Script failed at line $LINENO with exit code $?"; exit 1' ERR

echo "==> Rust Coverage Check Script"
echo ""

# Navigate to project root (parent of scripts directory)
echo "[1/6] Navigating to project root..."
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/.."
cd "$PROJECT_ROOT"
echo "    ✓ Working directory: $(pwd)"
echo ""

# Rust Coverage Check Script
# This script runs Rust tests with coverage and enforces an 80% threshold

# Check if cargo-llvm-cov is installed
echo "[2/6] Checking for cargo-llvm-cov installation..."
if ! command -v cargo-llvm-cov &> /dev/null; then
  echo "    ❌ cargo-llvm-cov is not installed"
  echo ""
  echo "To install it, run:"
  echo "  cargo install cargo-llvm-cov"
  echo ""
  echo "Note: This may take several minutes to compile."
  exit 1
fi
echo "    ✓ cargo-llvm-cov found"
echo ""

echo "[3/6] Navigating to Rust workspace..."
cd src-tauri
echo "    ✓ Working directory: $(pwd)"
echo ""

echo "[4/6] Running Rust tests with coverage..."
echo "    This may take several minutes on first run..."
echo ""

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
echo "[5/6] Extracting coverage percentage..."

# Extract coverage from TOTAL line, using the first percentage found
# Format: TOTAL [regions]  X.XX%  [functions]  Y.YY%  [lines]  Z.ZZ%
COVERAGE=$(echo "$COVERAGE_OUTPUT" | grep "TOTAL" | grep -o '[0-9]\+\.[0-9]\+%' | head -1 | sed 's/%//')
echo "Rust coverage: ${COVERAGE}%"

if [ -z "$COVERAGE" ]; then
  echo "    ❌ Could not parse coverage output"
  echo ""
  echo "Expected format: 'TOTAL ... XX.XX% ...'"
  echo "Please check the test output above for issues."
  exit 1
fi
echo "    ✓ Extracted coverage: ${COVERAGE}%"
echo ""

echo "[6/6] Checking coverage threshold..."
# Pure bash integer comparison (convert to integer by removing decimal)
COVERAGE_INT=${COVERAGE%.*}
echo "    Coverage: ${COVERAGE}% (threshold: 80%)"

if [ "$COVERAGE_INT" -lt 80 ]; then
  echo "    ❌ Rust coverage (${COVERAGE}%) is below 80% threshold"
  echo ""
  echo "To improve coverage, add more tests to untested code."
  exit 1
fi

echo "    ✓ Coverage meets threshold"
echo ""
echo "✅ All checks passed!"
