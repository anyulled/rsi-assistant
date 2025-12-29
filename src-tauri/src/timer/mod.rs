use serde::{Deserialize, Serialize};
use std::time::Instant;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "PascalCase")]
pub enum OperationMode {
    Normal,
    Quiet,
    Suspended,
    Reading,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum BreakType {
    Micro,
    Rest,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BreakConfig {
    pub microbreak_interval: u64, // seconds of activity
    pub microbreak_duration: u64, // seconds of idle required
    pub microbreak_enabled: bool,

    pub rest_interval: u64,
    pub rest_duration: u64,
    pub rest_enabled: bool,

    pub daily_limit: u64,
    pub daily_enabled: bool,

    pub warning_duration: u64,
    pub mode: OperationMode,
}

impl Default for BreakConfig {
    fn default() -> Self {
        Self {
            microbreak_interval: 180, // 3 min
            microbreak_duration: 30,
            microbreak_enabled: true,

            rest_interval: 2700, // 45 min
            rest_duration: 600,  // 10 min
            rest_enabled: true,

            daily_limit: 28800, // 8 hours
            daily_enabled: true,

            warning_duration: 30,
            mode: OperationMode::Normal,
        }
    }
}

#[derive(Debug, Serialize, Clone, Copy)]
#[serde(rename_all = "camelCase")]
pub struct TimerStatus {
    pub daily_usage: u64,
    pub daily_limit: u64,

    pub micro_active: u64,
    pub micro_target: u64,
    pub micro_is_overdue: bool,

    pub rest_active: u64,
    pub rest_target: u64,
    pub rest_is_overdue: bool,

    pub current_idle: u64,

    pub mode: OperationMode,

    // Active break state
    pub break_type: Option<BreakType>,
    pub break_duration: u64,
    pub break_elapsed: u64,
}

pub struct TimerService {
    pub config: BreakConfig,

    pub daily_usage: u64,
    pub micro_active: u64,
    pub rest_active: u64,

    pub current_idle: u64,

    // Active break tracking
    break_in_progress: Option<BreakType>,
    break_started_at: Option<Instant>,
}

impl TimerService {
    pub fn new(config: BreakConfig) -> Self {
        Self {
            config,
            daily_usage: 0,
            micro_active: 0,
            rest_active: 0,
            current_idle: 0,
            break_in_progress: None,
            break_started_at: None,
        }
    }

    pub fn tick(&mut self, is_idle: bool) {
        if self.config.mode == OperationMode::Suspended {
            return;
        }

        // In Reading mode, we treat idle time as active work time (for reading docs, etc.)
        // So we override 'is_idle' to false if in Reading mode and actually idle.
        // However, we still need to decide if we want to reset current_idle.
        // If we want timers to run, we should basically behave as if !is_idle.
        let effective_idle =
            if self.config.mode == OperationMode::Reading { false } else { is_idle };

        if effective_idle {
            self.current_idle = self.current_idle.saturating_add(1);

            // Check if microbreak should be cleared
            if self.config.microbreak_enabled
                && self.current_idle >= self.config.microbreak_duration
            {
                // If we were accumulating active time, reset it
                if self.micro_active > 0 {
                    self.micro_active = 0;
                    // Note: In a real app, we might want to "cap" the idle at duration
                    // or let it grow. Green bar usually fills then stops?
                }
            }

            // Check if rest break should be cleared
            if self.config.rest_enabled
                && self.current_idle >= self.config.rest_duration
                && self.rest_active > 0
            {
                self.rest_active = 0;
            }
        } else {
            // User Active
            self.current_idle = 0;
            self.daily_usage = self.daily_usage.saturating_add(1);

            if self.config.microbreak_enabled {
                self.micro_active = self.micro_active.saturating_add(1);
            }
            if self.config.rest_enabled {
                self.rest_active = self.rest_active.saturating_add(1);
            }
        }
    }

    pub fn update_config(&mut self, new_config: BreakConfig) {
        self.config = new_config;
    }

    pub fn reset_microbreak(&mut self) {
        self.micro_active = 0;
        // Clear break state if micro break was in progress
        if self.break_in_progress == Some(BreakType::Micro) {
            self.break_in_progress = None;
            self.break_started_at = None;
        }
    }

    pub fn reset_rest_break(&mut self) {
        self.rest_active = 0;
        // Clear break state if rest break was in progress
        if self.break_in_progress == Some(BreakType::Rest) {
            self.break_in_progress = None;
            self.break_started_at = None;
        }
    }

    pub fn set_mode(&mut self, mode: OperationMode) {
        self.config.mode = mode;
    }

    pub fn trigger_rest_break(&mut self) {
        // Set active time just above the interval to trigger 'overdue' logic
        // The actual overlay logic depends on the frontend seeing 'rest_is_overdue'
        self.rest_active = self.config.rest_interval + 1;
        // Start the break immediately
        self.start_break(BreakType::Rest);
    }

    pub fn trigger_microbreak(&mut self) {
        // Set active time just above the interval to trigger 'overdue' logic
        self.micro_active = self.config.microbreak_interval + 1;
        // Start the break immediately
        self.start_break(BreakType::Micro);
    }

    /// Start tracking an active break
    pub fn start_break(&mut self, break_type: BreakType) {
        self.break_in_progress = Some(break_type);
        self.break_started_at = Some(Instant::now());
    }

    /// Get the duration of the current break type
    fn get_break_duration(&self, break_type: BreakType) -> u64 {
        match break_type {
            BreakType::Micro => self.config.microbreak_duration,
            BreakType::Rest => self.config.rest_duration,
        }
    }

    /// Get elapsed time for current break
    fn get_break_elapsed(&self) -> u64 {
        self.break_started_at.map(|started| started.elapsed().as_secs()).unwrap_or(0)
    }

    pub fn get_status(&self) -> TimerStatus {
        let break_duration =
            self.break_in_progress.map(|bt| self.get_break_duration(bt)).unwrap_or(0);
        let break_elapsed = self.get_break_elapsed();

        TimerStatus {
            daily_usage: self.daily_usage,
            daily_limit: self.config.daily_limit,

            micro_active: self.micro_active,
            micro_target: self.config.microbreak_interval,
            micro_is_overdue: self.micro_active > self.config.microbreak_interval,

            rest_active: self.rest_active,
            rest_target: self.config.rest_interval,
            rest_is_overdue: self.rest_active > self.config.rest_interval,

            current_idle: self.current_idle,
            mode: self.config.mode,

            break_type: self.break_in_progress,
            break_duration,
            break_elapsed,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_accumulation_and_reset() {
        let mut config = BreakConfig::default();
        config.microbreak_interval = 10;
        config.microbreak_duration = 5;

        let mut service = TimerService::new(config);

        // Tick active for 10 seconds
        for _ in 0..10 {
            service.tick(false);
        }
        assert_eq!(service.micro_active, 10);
        assert_eq!(service.current_idle, 0);

        // Tick idle for 4 seconds (not enough)
        for _ in 0..4 {
            service.tick(true);
        }
        assert_eq!(service.micro_active, 10);
        assert_eq!(service.current_idle, 4);

        // One more idle tick -> Reset
        service.tick(true);
        assert_eq!(service.current_idle, 5);
        assert_eq!(service.micro_active, 0);

        // Next active tick resets idle
        service.tick(false);
        assert_eq!(service.current_idle, 0);
        assert_eq!(service.micro_active, 1);
    }

    #[test]
    fn test_suspended_mode() {
        let mut config = BreakConfig::default();
        config.mode = OperationMode::Suspended;
        let mut service = TimerService::new(config);

        service.tick(false);
        assert_eq!(service.daily_usage, 0); // Should not increase
    }

    #[test]
    fn test_reset_microbreak() {
        let mut config = BreakConfig::default();
        config.microbreak_interval = 10;
        let mut service = TimerService::new(config);

        // Accumulate active time
        for _ in 0..15 {
            service.tick(false);
        }
        assert!(service.micro_active > 10);

        service.reset_microbreak();
        assert_eq!(service.micro_active, 0);
    }

    #[test]
    fn test_reset_rest_break() {
        let mut config = BreakConfig::default();
        config.rest_interval = 20;
        let mut service = TimerService::new(config);

        for _ in 0..25 {
            service.tick(false);
        }
        assert!(service.rest_active > 20);

        service.reset_rest_break();
        assert_eq!(service.rest_active, 0);
    }

    #[test]
    fn test_update_config() {
        let mut config = BreakConfig::default();
        config.microbreak_interval = 100;
        let mut service = TimerService::new(config);

        assert_eq!(service.config.microbreak_interval, 100);

        let mut new_config = BreakConfig::default();
        new_config.microbreak_interval = 200;
        service.update_config(new_config);

        assert_eq!(service.config.microbreak_interval, 200);
    }

    #[test]
    fn test_trigger_rest_break() {
        let mut config = BreakConfig::default();
        config.rest_interval = 100;
        let mut service = TimerService::new(config);

        service.trigger_rest_break();
        assert!(service.rest_active > service.config.rest_interval);
    }

    #[test]
    fn test_trigger_microbreak() {
        let config = BreakConfig {
            microbreak_interval: 100,
            microbreak_duration: 30,
            ..BreakConfig::default()
        };
        let mut service = TimerService::new(config);

        service.trigger_microbreak();

        // Should be overdue
        assert!(service.micro_active > service.config.microbreak_interval);

        // Should have break state set
        let status = service.get_status();
        assert_eq!(status.break_type, Some(BreakType::Micro));
        assert_eq!(status.break_duration, 30);
        assert!(status.micro_is_overdue);
    }

    #[test]
    fn test_trigger_rest_break_sets_break_state() {
        let config =
            BreakConfig { rest_interval: 100, rest_duration: 600, ..BreakConfig::default() };
        let mut service = TimerService::new(config);

        service.trigger_rest_break();

        let status = service.get_status();
        assert_eq!(status.break_type, Some(BreakType::Rest));
        assert_eq!(status.break_duration, 600);
        assert!(status.rest_is_overdue);
    }

    #[test]
    fn test_mode_switching() {
        let config = BreakConfig::default();
        let mut service = TimerService::new(config);

        service.set_mode(OperationMode::Quiet);
        assert_eq!(service.config.mode, OperationMode::Quiet);

        service.set_mode(OperationMode::Normal);
        assert_eq!(service.config.mode, OperationMode::Normal);
    }

    #[test]
    fn test_reading_mode_accumulates_on_idle() {
        let mut config = BreakConfig::default();
        config.mode = OperationMode::Reading;
        let mut service = TimerService::new(config);

        // Tick with is_idle = true
        for _ in 0..10 {
            service.tick(true);
        }

        // Should accumulate active time despite being "idle" (no input)
        assert_eq!(service.daily_usage, 10);
        assert_eq!(service.micro_active, 10);
        assert_eq!(service.current_idle, 0); // Should be 0 because we treated it as active
    }

    /// Integration test: Verify OperationMode serializes to PascalCase strings
    /// that match the frontend TypeScript type definitions.
    /// This prevents backend-frontend communication bugs due to case mismatches.
    #[test]
    fn test_operation_mode_serialization_contract() {
        // These are the exact strings the frontend expects (src/types.ts: OperationMode)
        let expected_modes = vec!["Normal", "Quiet", "Suspended", "Reading"];

        let modes = vec![
            OperationMode::Normal,
            OperationMode::Quiet,
            OperationMode::Suspended,
            OperationMode::Reading,
        ];

        for (mode, expected) in modes.iter().zip(expected_modes.iter()) {
            let serialized = serde_json::to_string(mode).unwrap();
            // serde_json wraps strings in quotes, so we compare with quoted expected
            assert_eq!(
                serialized,
                format!("\"{}\"", expected),
                "OperationMode::{:?} should serialize to \"{}\" for frontend compatibility",
                mode,
                expected
            );
        }

        // Also verify deserialization works with frontend strings
        for (expected_mode, mode_str) in modes.iter().zip(expected_modes.iter()) {
            let deserialized: OperationMode =
                serde_json::from_str(&format!("\"{}\"", mode_str)).unwrap();
            assert_eq!(
                &deserialized, expected_mode,
                "Frontend string \"{}\" should deserialize to OperationMode::{:?}",
                mode_str, expected_mode
            );
        }
    }
}
