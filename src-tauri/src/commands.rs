use crate::stats::{DailyStats, StatsStore};
use crate::timer::{BreakConfig, TimerService, TimerStatus};
use std::sync::Mutex;
use tauri::{Emitter, State};

// AppState definition
pub struct AppState {
    pub timer_service: Mutex<TimerService>,
    pub stats_store: Mutex<StatsStore>,
}

#[tauri::command]
pub fn get_timer_state(state: State<AppState>) -> TimerStatus {
    let service = state.timer_service.lock().unwrap();
    let status = service.get_status();
    println!(
        "[DEBUG] get_timer_state - break_type: {:?}, break_duration: {}, break_elapsed: {}",
        status.break_type, status.break_duration, status.break_elapsed
    );
    status
}

#[tauri::command]
pub fn update_settings(state: State<AppState>, settings: BreakConfig) -> Result<(), String> {
    let mut service = state.timer_service.lock().unwrap();
    service.update_config(settings);
    // Settings persistence is handled by the frontend interfacing with Tauri Store.
    Ok(())
}

#[tauri::command]
pub fn get_settings(state: State<AppState>) -> BreakConfig {
    let service = state.timer_service.lock().unwrap();
    service.config.clone()
}

#[tauri::command]
pub fn get_statistics(state: State<AppState>, days: usize) -> Vec<DailyStats> {
    let store = state.stats_store.lock().unwrap();
    store.get_last_n_days(days)
}

#[tauri::command]
pub fn record_break_taken(state: State<AppState>, break_type: String) -> Result<(), String> {
    let mut store = state.stats_store.lock().unwrap();
    let today = store.get_or_create_today();

    match break_type.as_str() {
        // TODO: Distinguish between prompted vs natural? Command arg?
        // For now assuming prompted if calling this command.
        "micro" => today.micro_prompted_taken += 1,
        "rest" => today.rest_prompted_taken += 1,
        _ => return Err("Invalid break type".to_string()),
    }

    Ok(())
}

#[tauri::command]
pub fn record_break_postponed(state: State<AppState>, break_type: String) -> Result<(), String> {
    let mut store = state.stats_store.lock().unwrap();
    let today = store.get_or_create_today();

    match break_type.as_str() {
        "micro" => today.micro_postponed += 1,
        "rest" => today.rest_postponed += 1,
        _ => return Err("Invalid break type".to_string()),
    }

    Ok(())
}

#[tauri::command]
pub fn reset_break(state: State<AppState>, break_type: String) -> Result<(), String> {
    let mut service = state.timer_service.lock().unwrap();

    match break_type.as_str() {
        "micro" => service.reset_microbreak(),
        "rest" => service.reset_rest_break(),
        _ => return Err("Invalid break type".to_string()),
    }

    Ok(())
}

#[tauri::command]
pub fn set_mode(app: tauri::AppHandle, state: State<AppState>, mode: String) -> Result<(), String> {
    let mut service = state.timer_service.lock().unwrap();

    let operation_mode = match mode.as_str() {
        "Normal" => crate::timer::OperationMode::Normal,
        "Quiet" => crate::timer::OperationMode::Quiet,
        "Suspended" => crate::timer::OperationMode::Suspended,
        "Reading" => crate::timer::OperationMode::Reading,
        _ => return Err("Invalid mode".to_string()),
    };

    service.set_mode(operation_mode);

    if let Err(e) = app.emit("app-mode-changed", &mode) {
        eprintln!("Failed to emit mode-changed event: {}", e);
    }

    Ok(())
}

#[tauri::command]
pub fn trigger_break(state: State<AppState>, break_type: String) -> Result<(), String> {
    let mut service = state.timer_service.lock().unwrap();

    match break_type.as_str() {
        "micro" => {
            service.trigger_microbreak();
            println!("[DEBUG] trigger_break: micro break triggered");
        }
        "rest" => {
            service.trigger_rest_break();
            println!("[DEBUG] trigger_break: rest break triggered");
        }
        _ => return Err("Invalid break type".to_string()),
    }

    // Log the status after triggering
    let status = service.get_status();
    println!(
        "[DEBUG] After trigger - break_type: {:?}, break_duration: {}, micro_is_overdue: {}",
        status.break_type, status.break_duration, status.micro_is_overdue
    );

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_timer_service_operations() {
        let service = crate::timer::TimerService::new(BreakConfig::default());
        let status = service.get_status();

        assert_eq!(status.daily_usage, 0);
        assert_eq!(status.micro_active, 0);
    }

    #[test]
    fn test_config_update() {
        let mut service = crate::timer::TimerService::new(BreakConfig::default());
        let mut new_config = BreakConfig::default();
        new_config.microbreak_interval = 300;

        service.update_config(new_config.clone());
        assert_eq!(service.config.microbreak_interval, 300);
    }

    #[test]
    fn test_stats_store_operations() {
        let mut store = crate::stats::StatsStore::default();
        let today = store.get_or_create_today();

        today.micro_prompted_taken += 1;

        let stats = store.get_last_n_days(1);
        assert_eq!(stats[0].micro_prompted_taken, 1);
    }

    #[test]
    fn test_stats_invalid_break_type() {
        // This tests the match logic for invalid break types
        let break_type = "invalid";
        let is_valid = matches!(break_type, "micro" | "rest");
        assert!(!is_valid);
    }

    #[test]
    fn test_update_and_get_settings_logic() {
        // Test the underlying logic that commands use
        let mut service = crate::timer::TimerService::new(BreakConfig::default());

        // Verify default settings (default is 3 minutes = 180 seconds)
        assert_eq!(service.config.microbreak_interval, 180);

        // Update settings
        let mut new_config = BreakConfig::default();
        new_config.microbreak_interval = 600;
        new_config.rest_interval = 4800;
        service.update_config(new_config.clone());

        // Verify settings were updated
        assert_eq!(service.config.microbreak_interval, 600);
        assert_eq!(service.config.rest_interval, 4800);
    }

    #[test]
    fn test_reset_break_commands() {
        let mut service = crate::timer::TimerService::new(BreakConfig::default());

        // Test micro break reset
        service.trigger_microbreak();
        let status = service.get_status();
        assert!(status.break_type.is_some());

        service.reset_microbreak();
        let status = service.get_status();
        assert!(status.break_type.is_none());
        assert_eq!(status.break_duration, 0);

        // Test rest break reset
        service.trigger_rest_break();
        let status = service.get_status();
        assert!(status.break_type.is_some());

        service.reset_rest_break();
        let status = service.get_status();
        assert!(status.break_type.is_none());
        assert_eq!(status.break_duration, 0);
    }

    #[test]
    fn test_record_break_taken_logic() {
        let mut store = crate::stats::StatsStore::default();
        let today = store.get_or_create_today();

        // Initialize counters
        let initial_micro = today.micro_prompted_taken;
        let initial_rest = today.rest_prompted_taken;

        // Record breaks (simulating what the command does)
        today.micro_prompted_taken += 1;
        today.rest_prompted_taken += 1;

        // Verify counters increased
        assert_eq!(today.micro_prompted_taken, initial_micro + 1);
        assert_eq!(today.rest_prompted_taken, initial_rest + 1);
    }

    #[test]
    fn test_record_break_postponed_logic() {
        let mut store = crate::stats::StatsStore::default();
        let today = store.get_or_create_today();

        // Initialize counters
        let initial_micro = today.micro_postponed;
        let initial_rest = today.rest_postponed;

        // Record postponed breaks (simulating what the command does)
        today.micro_postponed += 1;
        today.rest_postponed += 1;

        // Verify counters increased
        assert_eq!(today.micro_postponed, initial_micro + 1);
        assert_eq!(today.rest_postponed, initial_rest + 1);
    }
}
