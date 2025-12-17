/**
 * Integration tests for TypeScript/Rust Tauri command interfaces
 * These tests verify that TypeScript types match Rust structs
 */

import { describe, it, expect, beforeAll } from "bun:test";
import { invoke } from "@tauri-apps/api/core";

// Type definitions matching Rust structs
interface TimerStatus {
    daily_usage: number;
    daily_limit: number;
    micro_active: number;
    micro_target: number;
    micro_is_overdue: boolean;
    rest_active: number;
    rest_target: number;
    rest_is_overdue: boolean;
    current_idle: number;
    mode: string;
}

interface BreakConfig {
    microbreakInterval: number;
    microbreakDuration: number;
    microbreakEnabled: boolean;
    restInterval: number;
    restDuration: number;
    restEnabled: boolean;
    dailyLimit: number;
    dailyEnabled: boolean;
    warningDuration: number;
    mode: string;
}

interface DailyStats {
    date: string;
    totalUsageSeconds: number;
    microbreaksTaken: number;
    microbreaksPostponed: number;
    restBreaksTaken: number;
    restBreaksPostponed: number;
}

describe("Tauri Command Integration Tests", () => {
    // Skip if not running in Tauri environment
    const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

    if (!isTauri) {
        it.skip("Tauri commands (not in Tauri environment)", () => { });
        return;
    }

    describe("get_timer_state", () => {
        it("should return valid TimerStatus structure", async () => {
            const status = await invoke<TimerStatus>("get_timer_state");

            // Verify all required fields exist
            expect(status).toHaveProperty("daily_usage");
            expect(status).toHaveProperty("daily_limit");
            expect(status).toHaveProperty("micro_active");
            expect(status).toHaveProperty("micro_target");
            expect(status).toHaveProperty("micro_is_overdue");
            expect(status).toHaveProperty("rest_active");
            expect(status).toHaveProperty("rest_target");
            expect(status).toHaveProperty("rest_is_overdue");
            expect(status).toHaveProperty("current_idle");
            expect(status).toHaveProperty("mode");

            // Verify types
            expect(typeof status.daily_usage).toBe("number");
            expect(typeof status.daily_limit).toBe("number");
            expect(typeof status.micro_active).toBe("number");
            expect(typeof status.micro_target).toBe("number");
            expect(typeof status.micro_is_overdue).toBe("boolean");
            expect(typeof status.rest_active).toBe("number");
            expect(typeof status.rest_target).toBe("number");
            expect(typeof status.rest_is_overdue).toBe("boolean");
            expect(typeof status.current_idle).toBe("number");
            expect(typeof status.mode).toBe("string");
        });
    });

    describe("get_settings", () => {
        it("should return valid BreakConfig structure", async () => {
            const config = await invoke<BreakConfig>("get_settings");

            // Verify all required fields exist with camelCase naming
            expect(config).toHaveProperty("microbreakInterval");
            expect(config).toHaveProperty("microbreakDuration");
            expect(config).toHaveProperty("microbreakEnabled");
            expect(config).toHaveProperty("restInterval");
            expect(config).toHaveProperty("restDuration");
            expect(config).toHaveProperty("restEnabled");
            expect(config).toHaveProperty("dailyLimit");
            expect(config).toHaveProperty("dailyEnabled");
            expect(config).toHaveProperty("warningDuration");
            expect(config).toHaveProperty("mode");

            // Verify types
            expect(typeof config.microbreakInterval).toBe("number");
            expect(typeof config.microbreakDuration).toBe("number");
            expect(typeof config.microbreakEnabled).toBe("boolean");
            expect(typeof config.restInterval).toBe("number");
            expect(typeof config.restDuration).toBe("number");
            expect(typeof config.restEnabled).toBe("boolean");
            expect(typeof config.dailyLimit).toBe("number");
            expect(typeof config.dailyEnabled).toBe("boolean");
            expect(typeof config.warningDuration).toBe("number");
            expect(typeof config.mode).toBe("string");
        });
    });

    describe("update_settings", () => {
        it("should accept and apply BreakConfig", async () => {
            const originalConfig = await invoke<BreakConfig>("get_settings");

            const newConfig: BreakConfig = {
                ...originalConfig,
                microbreakInterval: 300, // 5 minutes
            };

            await invoke("update_settings", { config: newConfig });

            const updatedConfig = await invoke<BreakConfig>("get_settings");
            expect(updatedConfig.microbreakInterval).toBe(300);

            // Restore original
            await invoke("update_settings", { config: originalConfig });
        });
    });

    describe("get_statistics", () => {
        it("should return array of DailyStats with camelCase fields", async () => {
            const stats = await invoke<DailyStats[]>("get_statistics", { days: 7 });

            expect(Array.isArray(stats)).toBe(true);

            // If there are stats, verify structure
            if (stats.length > 0) {
                const stat = stats[0];

                // Verify camelCase field names (not snake_case)
                expect(stat).toHaveProperty("date");
                expect(stat).toHaveProperty("totalUsageSeconds");
                expect(stat).toHaveProperty("microbreaksTaken");
                expect(stat).toHaveProperty("microbreaksPostponed");
                expect(stat).toHaveProperty("restBreaksTaken");
                expect(stat).toHaveProperty("restBreaksPostponed");

                // Verify types
                expect(typeof stat.date).toBe("string");
                expect(typeof stat.totalUsageSeconds).toBe("number");
                expect(typeof stat.microbreaksTaken).toBe("number");
                expect(typeof stat.microbreaksPostponed).toBe("number");
                expect(typeof stat.restBreaksTaken).toBe("number");
                expect(typeof stat.restBreaksPostponed).toBe("number");

                // Verify NO snake_case fields exist
                expect(stat).not.toHaveProperty("total_usage_seconds");
                expect(stat).not.toHaveProperty("microbreaks_taken");
            }
        });
    });

    describe("record_break_taken", () => {
        it("should accept valid break types", async () => {
            await expect(invoke("record_break_taken", { breakType: "micro" })).resolves.toBeUndefined();
            await expect(invoke("record_break_taken", { breakType: "rest" })).resolves.toBeUndefined();
        });

        it("should reject invalid break types", async () => {
            await expect(
                invoke("record_break_taken", { breakType: "invalid" })
            ).rejects.toThrow();
        });
    });

    describe("record_break_postponed", () => {
        it("should accept valid break types", async () => {
            await expect(invoke("record_break_postponed", { breakType: "micro" })).resolves.toBeUndefined();
            await expect(invoke("record_break_postponed", { breakType: "rest" })).resolves.toBeUndefined();
        });

        it("should reject invalid break types", async () => {
            await expect(
                invoke("record_break_postponed", { breakType: "invalid" })
            ).rejects.toThrow();
        });
    });

    describe("reset_break", () => {
        it("should accept valid break types", async () => {
            await expect(invoke("reset_break", { breakType: "micro" })).resolves.toBeUndefined();
            await expect(invoke("reset_break", { breakType: "rest" })).resolves.toBeUndefined();
        });

        it("should reject invalid break types", async () => {
            await expect(
                invoke("reset_break", { breakType: "invalid" })
            ).rejects.toThrow();
        });

        it("should reset break timer after recording", async () => {
            // Get initial status
            const initialStatus = await invoke<any>("get_timer_state");

            // Record a break taken
            await invoke("record_break_taken", { breakType: "micro" });

            // Reset the break
            await invoke("reset_break", { breakType: "micro" });

            // Get status after reset
            const afterStatus = await invoke<any>("get_timer_state");

            // Microbreak timer should be reset to 0
            expect(afterStatus.micro_active).toBe(0);
        });
    });
});
