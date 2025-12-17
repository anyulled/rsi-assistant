use super::*;
use crate::timer::{BreakConfig, OperationMode};
use std::sync::Mutex;

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_state() -> AppState {
        AppState {
            timer_service: Mutex::new(crate::timer::TimerService::new(BreakConfig::default())),
            stats_store: Mutex::new(crate::stats::StatsStore::default()),
        }
    }

    #[test]
    fn test_get_timer_state() {
        let state = create_test_state();
        let status = get_timer_state(tauri::State::from(&state));

        assert_eq!(status.daily_usage, 0);
        assert_eq!(status.micro_active, 0);
        assert_eq!(status.rest_active, 0);
    }

    #[test]
    fn test_get_settings() {
        let state = create_test_state();
        let settings = get_settings(tauri::State::from(&state));

        assert_eq!(settings.microbreak_interval, 180);
        assert_eq!(settings.rest_interval, 2700);
        assert_eq!(settings.daily_limit, 28800);
        assert!(settings.microbreak_enabled);
    }

    #[test]
    fn test_update_settings() {
        let state = create_test_state();
        let mut new_settings = BreakConfig::default();
        new_settings.microbreak_interval = 300;
        new_settings.mode = OperationMode::Quiet;

        let result = update_settings(tauri::State::from(&state), new_settings.clone());
        assert!(result.is_ok());

        let updated = get_settings(tauri::State::from(&state));
        assert_eq!(updated.microbreak_interval, 300);
        assert_eq!(updated.mode, OperationMode::Quiet);
    }

    #[test]
    fn test_get_statistics_empty() {
        let state = create_test_state();
        let stats = get_statistics(tauri::State::from(&state), 7);

        assert_eq!(stats.len(), 0);
    }

    #[test]
    fn test_record_break_taken_micro() {
        let state = create_test_state();
        let result = record_break_taken(tauri::State::from(&state), "micro".to_string());

        assert!(result.is_ok());

        let stats = get_statistics(tauri::State::from(&state), 1);
        assert_eq!(stats.len(), 1);
        assert_eq!(stats[0].microbreaks_taken, 1);
    }

    #[test]
    fn test_record_break_taken_rest() {
        let state = create_test_state();
        let result = record_break_taken(tauri::State::from(&state), "rest".to_string());

        assert!(result.is_ok());

        let stats = get_statistics(tauri::State::from(&state), 1);
        assert_eq!(stats[0].rest_breaks_taken, 1);
    }

    #[test]
    fn test_record_break_taken_invalid() {
        let state = create_test_state();
        let result = record_break_taken(tauri::State::from(&state), "invalid".to_string());

        assert!(result.is_err());
    }

    #[test]
    fn test_record_break_postponed_micro() {
        let state = create_test_state();
        let result = record_break_postponed(tauri::State::from(&state), "micro".to_string());

        assert!(result.is_ok());

        let stats = get_statistics(tauri::State::from(&state), 1);
        assert_eq!(stats[0].microbreaks_postponed, 1);
    }

    #[test]
    fn test_record_break_postponed_rest() {
        let state = create_test_state();
        let result = record_break_postponed(tauri::State::from(&state), "rest".to_string());

        assert!(result.is_ok());

        let stats = get_statistics(tauri::State::from(&state), 1);
        assert_eq!(stats[0].rest_breaks_postponed, 1);
    }

    #[test]
    fn test_multiple_breaks_same_day() {
        let state = create_test_state();

        record_break_taken(tauri::State::from(&state), "micro".to_string()).unwrap();
        record_break_taken(tauri::State::from(&state), "micro".to_string()).unwrap();
        record_break_postponed(tauri::State::from(&state), "rest".to_string()).unwrap();

        let stats = get_statistics(tauri::State::from(&state), 1);
        assert_eq!(stats[0].microbreaks_taken, 2);
        assert_eq!(stats[0].rest_breaks_postponed, 1);
    }
}
