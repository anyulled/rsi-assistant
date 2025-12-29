#!/usr/bin/env bash
set -e

# Frontend Coverage Check Script
# This script runs frontend tests with coverage and enforces an 80% threshold

echo "Running frontend tests with coverage..."

# Run tests with coverage once and capture output
COVERAGE_OUTPUT=$(bun test --coverage ./src 2>&1)
echo "$COVERAGE_OUTPUT"

echo ""
echo "Extracting coverage percentage..."

# Extract coverage percentage from "All files" line using sed
# Format: "All files                        |   80.19 |   92.69 |"
COVERAGE=$(echo "$COVERAGE_OUTPUT" | grep "All files" | sed 's/[^|]*|[^0-9]*\([0-9]*\.[0-9]*\).*/\1/')
echo "Frontend coverage: ${COVERAGE}%"

if [ -z "$COVERAGE" ]; then
  echo "❌ Could not parse coverage output"
  exit 1
fi

# Pure bash integer comparison (convert to integer by removing decimal)
COVERAGE_INT=${COVERAGE%.*}
echo "Coverage as integer: $COVERAGE_INT"

if [ "$COVERAGE_INT" -lt 80 ]; then
  echo "❌ Frontend coverage (${COVERAGE}%) is below 80% threshold"
  exit 1
fi

echo "✅ Frontend coverage (${COVERAGE}%) meets 80% threshold"
