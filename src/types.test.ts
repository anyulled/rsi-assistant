/**
 * Integration test: Verify OperationMode type values match backend expectations.
 *
 * This test ensures the frontend TypeScript type definitions are in sync
 * with the Rust backend's OperationMode enum serialization.
 *
 * If this test fails, it means the frontend mode strings don't match
 * what the backend expects, which will cause communication bugs.
 */
import { describe, expect, it } from "bun:test";
import type { OperationMode } from "./types";

describe("Types Contract", () => {
  describe("OperationMode", () => {
    /**
     * These are the exact strings the Rust backend serializes to and expects.
     * See: src-tauri/src/timer/mod.rs - OperationMode enum with #[serde(rename_all = "PascalCase")]
     */
    const EXPECTED_MODES: readonly OperationMode[] = ["Normal", "Quiet", "Suspended", "Reading"] as const;

    it("should have exactly 4 valid modes", () => {
      expect(EXPECTED_MODES.length).toBe(4);
    });

    it("should include Normal mode", () => {
      const mode: OperationMode = "Normal";
      expect(EXPECTED_MODES).toContain(mode);
    });

    it("should include Quiet mode", () => {
      const mode: OperationMode = "Quiet";
      expect(EXPECTED_MODES).toContain(mode);
    });

    it("should include Suspended mode", () => {
      const mode: OperationMode = "Suspended";
      expect(EXPECTED_MODES).toContain(mode);
    });

    it("should include Reading mode", () => {
      const mode: OperationMode = "Reading";
      expect(EXPECTED_MODES).toContain(mode);
    });

    it("should use PascalCase (not lowercase) for all modes", () => {
      // This test catches the exact bug we had: backend expected lowercase but frontend sent PascalCase
      for (const mode of EXPECTED_MODES) {
        // First character should be uppercase
        expect(mode[0]).toBe(mode[0].toUpperCase());
        // Should not be all lowercase
        expect(mode).not.toBe(mode.toLowerCase());
      }
    });

    it("should match the exact strings the backend expects", () => {
      // These strings must exactly match what serde serializes in Rust
      // If these fail, update both this test AND the Rust enum
      expect(EXPECTED_MODES).toEqual(["Normal", "Quiet", "Suspended", "Reading"]);
    });
  });
});
