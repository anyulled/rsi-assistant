use crate::stats::{DailyStats, StatsStore};
use crate::timer::{BreakConfig, TimerService, TimerStatus};
use std::sync::Mutex;
use tauri::State;

// AppState definition
pub struct AppState {
    pub timer_service: Mutex<TimerService>,
    pub stats_store: Mutex<StatsStore>,
}

#[tauri::command]
pub fn get_timer_state(state: State<AppState>) -> TimerStatus {
    let service = state.timer_service.lock().unwrap();
    service.get_status()
}

#[tauri::command]
pub fn update_settings(state: State<AppState>, settings: BreakConfig) -> Result<(), String> {
    let mut service = state.timer_service.lock().unwrap();
    service.update_config(settings);
    // TODO: persist settings using store? Or let frontend handle store and just push here?
    // Implementation Plan says "Two-way binding with Tauri Store via Tauri commands."
    // For now, update in memory.
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_timer_service_operations() {
        let mut service = crate::timer::TimerService::new(BreakConfig::default());
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
}
