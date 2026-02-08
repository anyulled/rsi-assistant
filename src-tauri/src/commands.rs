use crate::stats::{DailyStats, StatsStore};
use crate::timer::{BreakConfig, TimerService, TimerStatus};
use std::sync::Mutex;
use tauri::{Emitter, State};

// AppState definition
pub struct AppState {
    pub timer_service: Mutex<TimerService>,
    pub stats_store: Mutex<StatsStore>,
}

fn get_timer_state_impl(service: &TimerService) -> TimerStatus {
    let status = service.get_status();
    println!(
        "[DEBUG] get_timer_state - break_type: {:?}, break_duration: {}, break_elapsed: {}",
        status.break_type, status.break_duration, status.break_elapsed
    );
    status
}

#[tauri::command]
pub fn get_timer_state(state: State<AppState>) -> TimerStatus {
    let service = state.timer_service.lock().unwrap();
    get_timer_state_impl(&service)
}

fn update_settings_impl(service: &mut TimerService, settings: BreakConfig) {
    service.update_config(settings);
}

#[tauri::command]
pub fn update_settings(state: State<AppState>, settings: BreakConfig) -> Result<(), String> {
    let mut service = state.timer_service.lock().unwrap();
    update_settings_impl(&mut service, settings);
    // Settings persistence is handled by the frontend interfacing with Tauri Store.
    Ok(())
}

fn get_settings_impl(service: &TimerService) -> BreakConfig {
    service.config.clone()
}

#[tauri::command]
pub fn get_settings(state: State<AppState>) -> BreakConfig {
    let service = state.timer_service.lock().unwrap();
    get_settings_impl(&service)
}

fn get_statistics_impl(store: &StatsStore, days: usize) -> Vec<DailyStats> {
    store.get_last_n_days(days)
}

#[tauri::command]
pub fn get_statistics(state: State<AppState>, days: usize) -> Vec<DailyStats> {
    let store = state.stats_store.lock().unwrap();
    get_statistics_impl(&store, days)
}

fn record_break_taken_impl(
    store: &mut StatsStore,
    break_type: &str,
    was_prompted: bool,
) -> Result<(), String> {
    let today = store.get_or_create_today();

    let field_to_increment = match (break_type, was_prompted) {
        ("micro", true) => &mut today.micro_prompted_taken,
        ("micro", false) => &mut today.micro_natural_taken,
        ("rest", true) => &mut today.rest_prompted_taken,
        ("rest", false) => &mut today.rest_natural_taken,
        _ => return Err("Invalid break type".to_string()),
    };
    *field_to_increment += 1;

    Ok(())
}

#[tauri::command]
pub fn record_break_taken(
    state: State<AppState>,
    break_type: String,
    was_prompted: bool,
) -> Result<(), String> {
    let mut store = state.stats_store.lock().unwrap();
    record_break_taken_impl(&mut store, &break_type, was_prompted)
}

fn record_break_postponed_impl(store: &mut StatsStore, break_type: &str) -> Result<(), String> {
    let today = store.get_or_create_today();

    match break_type {
        "micro" => today.micro_postponed += 1,
        "rest" => today.rest_postponed += 1,
        _ => return Err("Invalid break type".to_string()),
    }

    Ok(())
}

#[tauri::command]
pub fn record_break_postponed(state: State<AppState>, break_type: String) -> Result<(), String> {
    let mut store = state.stats_store.lock().unwrap();
    record_break_postponed_impl(&mut store, &break_type)
}

fn reset_break_impl(service: &mut TimerService, break_type: &str) -> Result<(), String> {
    match break_type {
        "micro" => service.reset_microbreak(),
        "rest" => service.reset_rest_break(),
        _ => return Err("Invalid break type".to_string()),
    }
    Ok(())
}

#[tauri::command]
pub fn reset_break(state: State<AppState>, break_type: String) -> Result<(), String> {
    let mut service = state.timer_service.lock().unwrap();
    reset_break_impl(&mut service, &break_type)
}

fn set_mode_impl(service: &mut TimerService, mode: &str) -> Result<(), String> {
    let operation_mode = match mode {
        "Normal" => crate::timer::OperationMode::Normal,
        "Quiet" => crate::timer::OperationMode::Quiet,
        "Suspended" => crate::timer::OperationMode::Suspended,
        "Reading" => crate::timer::OperationMode::Reading,
        _ => return Err("Invalid mode".to_string()),
    };

    service.set_mode(operation_mode);
    Ok(())
}

#[tauri::command]
pub fn set_mode(app: tauri::AppHandle, state: State<AppState>, mode: String) -> Result<(), String> {
    let mut service = state.timer_service.lock().unwrap();

    set_mode_impl(&mut service, &mode)?;

    if let Err(e) = app.emit("app-mode-changed", &mode) {
        eprintln!("Failed to emit mode-changed event: {}", e);
    }

    Ok(())
}

fn trigger_break_impl(service: &mut TimerService, break_type: &str) -> Result<(), String> {
    match break_type {
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
    Ok(())
}

#[tauri::command]
pub fn trigger_break(state: State<AppState>, break_type: String) -> Result<(), String> {
    let mut service = state.timer_service.lock().unwrap();
    trigger_break_impl(&mut service, &break_type)?;

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
        let status = get_timer_state_impl(&service);

        assert_eq!(status.daily_usage, 0);
        assert_eq!(status.micro_active, 0);
    }

    #[test]
    fn test_config_update() {
        let mut service = crate::timer::TimerService::new(BreakConfig::default());
        let mut new_config = BreakConfig::default();
        new_config.microbreak_interval = 300;

        update_settings_impl(&mut service, new_config.clone());
        assert_eq!(service.config.microbreak_interval, 300);
    }

    #[test]
    fn test_stats_store_operations() {
        let mut store = crate::stats::StatsStore::default();
        let today = store.get_or_create_today();

        today.micro_prompted_taken += 1;

        let stats = get_statistics_impl(&store, 1);
        assert_eq!(stats[0].micro_prompted_taken, 1);
    }

    #[test]
    fn test_stats_invalid_break_type() {
        let mut store = crate::stats::StatsStore::default();
        let err = record_break_taken_impl(&mut store, "invalid", true);
        assert!(err.is_err());
        assert_eq!(err.unwrap_err(), "Invalid break type");

        let err = record_break_postponed_impl(&mut store, "invalid");
        assert!(err.is_err());
        assert_eq!(err.unwrap_err(), "Invalid break type");
    }

    #[test]
    fn test_update_and_get_settings_logic() {
        // Test the underlying logic that commands use
        let mut service = crate::timer::TimerService::new(BreakConfig::default());

        // Verify default settings (default is 3 minutes = 180 seconds)
        let settings = get_settings_impl(&service);
        assert_eq!(settings.microbreak_interval, 180);

        // Update settings
        let mut new_config = BreakConfig::default();
        new_config.microbreak_interval = 600;
        new_config.rest_interval = 4800;
        update_settings_impl(&mut service, new_config.clone());

        // Verify settings were updated
        let settings = get_settings_impl(&service);
        assert_eq!(settings.microbreak_interval, 600);
        assert_eq!(settings.rest_interval, 4800);
    }

    #[test]
    fn test_reset_break_commands() {
        let mut service = crate::timer::TimerService::new(BreakConfig::default());

        // Test micro break reset
        trigger_break_impl(&mut service, "micro").unwrap();
        let status = service.get_status();
        assert!(status.break_type.is_some());

        reset_break_impl(&mut service, "micro").unwrap();
        let status = service.get_status();
        assert!(status.break_type.is_none());
        assert_eq!(status.break_duration, 0);

        // Test rest break reset
        trigger_break_impl(&mut service, "rest").unwrap();
        let status = service.get_status();
        assert!(status.break_type.is_some());

        reset_break_impl(&mut service, "rest").unwrap();
        let status = service.get_status();
        assert!(status.break_type.is_none());
        assert_eq!(status.break_duration, 0);

        // Test invalid
        assert!(reset_break_impl(&mut service, "invalid").is_err());
    }

    #[test]
    fn test_record_break_taken_logic() {
        let mut store = crate::stats::StatsStore::default();

        // Record breaks
        record_break_taken_impl(&mut store, "micro", true).unwrap();
        record_break_taken_impl(&mut store, "rest", true).unwrap();

        let today = store.get_or_create_today();
        assert_eq!(today.micro_prompted_taken, 1);
        assert_eq!(today.rest_prompted_taken, 1);
    }

    #[test]
    fn test_record_break_postponed_logic() {
        let mut store = crate::stats::StatsStore::default();

        // Record postponed
        record_break_postponed_impl(&mut store, "micro").unwrap();
        record_break_postponed_impl(&mut store, "rest").unwrap();

        let today = store.get_or_create_today();
        assert_eq!(today.micro_postponed, 1);
        assert_eq!(today.rest_postponed, 1);
    }

    #[test]
    fn test_set_mode_logic() {
        let mut service = crate::timer::TimerService::new(BreakConfig::default());

        set_mode_impl(&mut service, "Quiet").unwrap();

        // Verify state operation_mode logic is indirectly correct via what set_mode_impl calls,
        // although we can't inspect private state easily here unless we add getters.
        // But the main goal is hitting the lines in set_mode_impl.

        assert!(set_mode_impl(&mut service, "Normal").is_ok());
        assert!(set_mode_impl(&mut service, "Reading").is_ok());
        assert!(set_mode_impl(&mut service, "Suspended").is_ok());
        assert!(set_mode_impl(&mut service, "invalid").is_err());
    }

    #[test]
    fn test_trigger_break_logic() {
        let mut service = crate::timer::TimerService::new(BreakConfig::default());

        trigger_break_impl(&mut service, "micro").unwrap();
        assert!(service.get_status().break_type.is_some());

        assert!(trigger_break_impl(&mut service, "invalid").is_err());
    }
}
