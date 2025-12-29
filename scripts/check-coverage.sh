#!/usr/bin/env bash
set -euo pipefail

# Trap errors and interruptions for better error messages
trap 'echo ""; echo "❌ Script interrupted or failed at line $LINENO"; exit 130' INT TERM
trap 'echo ""; echo "❌ Script failed at line $LINENO with exit code $?"; exit 1' ERR

echo "==> Frontend Coverage Check Script"
echo ""

# Navigate to project root (parent of scripts directory)
echo "[1/5] Navigating to project root..."
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/.."
cd "$PROJECT_ROOT"
echo "    ✓ Working directory: $(pwd)"
echo ""

# Frontend Coverage Check Script
# This script runs frontend tests with coverage and enforces an 80% threshold

# Check if bun is installed
echo "[2/5] Checking for bun installation..."
if ! command -v bun &> /dev/null; then
  echo "    ❌ bun is not installed"
  echo ""
  echo "To install it, visit: https://bun.sh/"
  echo "Or run: curl -fsSL https://bun.sh/install | bash"
  echo ""
  exit 1
fi
echo "    ✓ bun found: $(command -v bun)"
echo ""

echo "[3/5] Running frontend tests with coverage..."
echo "    This may take a minute..."
echo ""

# Run tests with coverage once and capture output
# Use a temp file to handle large output and avoid subshell issues
TEMP_OUTPUT=$(mktemp)

# Disable the ERR trap temporarily to manually handle the test exit code
trap - ERR
set +e

echo "    Running tests..."
bun test --coverage ./src > "$TEMP_OUTPUT" 2>&1
TEST_EXIT_CODE=$?

# Restore the ERR trap and error handling
trap 'echo ""; echo "❌ Script failed at line $LINENO with exit code $?"; exit 1' ERR
set -e

COVERAGE_OUTPUT=$(cat "$TEMP_OUTPUT")
rm -f "$TEMP_OUTPUT"

if [ $TEST_EXIT_CODE -ne 0 ]; then
  echo "$COVERAGE_OUTPUT"
  echo ""
  echo "❌ Tests failed with exit code $TEST_EXIT_CODE"
  echo "See the output above for details."
  exit $TEST_EXIT_CODE
fi

# Print output for visibility (optional, or just summary?)
# We print it so the user can see test results even on success
echo "$COVERAGE_OUTPUT"

echo ""
echo "[4/5] Extracting coverage percentage..."

# Extract coverage percentage from "All files" line using sed
# Format: "All files                        |   80.19 |   92.69 |"
COVERAGE=$(echo "$COVERAGE_OUTPUT" | grep "All files" | sed 's/[^|]*|[^0-9]*\([0-9]*\.[0-9]*\).*/\1/')
echo "Frontend coverage: ${COVERAGE}%"

if [ -z "$COVERAGE" ]; then
  echo "    ❌ Could not parse coverage output"
  echo ""
  echo "Expected format: 'All files | XX.XX | ...'"
  echo "Please check the test output above for issues."
  exit 1
fi
echo "    ✓ Extracted coverage: ${COVERAGE}%"
echo ""

echo "[5/5] Checking coverage threshold..."
# Pure bash integer comparison (convert to integer by removing decimal)
COVERAGE_INT=${COVERAGE%.*}
echo "    Coverage: ${COVERAGE}% (threshold: 80%)"

if [ "$COVERAGE_INT" -lt 80 ]; then
  echo "    ❌ Frontend coverage (${COVERAGE}%) is below 80% threshold"
  echo ""
  echo "To improve coverage, add more tests to untested code."
  exit 1
fi

echo "    ✓ Coverage meets threshold"
echo ""
echo "✅ All checks passed!"
