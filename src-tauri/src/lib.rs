mod commands;
mod idle;
mod stats;
mod timer;

use crate::commands::AppState;
use crate::idle::DeviceQueryIdleDetector;
use crate::stats::StatsStore;
use crate::timer::{BreakConfig, TimerService};
use std::sync::Mutex;
use std::time::Duration;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::tray::TrayIconBuilder;
use tauri::{Emitter, Manager};
use tokio::time::sleep;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Initialize services
            let idle_detector = DeviceQueryIdleDetector::new();
            let timer_service = TimerService::new(BreakConfig::default());

            // Manage state
            app.manage(AppState {
                timer_service: Mutex::new(timer_service),
                stats_store: Mutex::new(StatsStore::default()),
            });

            // System Tray Setup - Comprehensive Menu
            use tauri::menu::CheckMenuItem;
            use tauri_plugin_dialog::DialogExt;

            // System Tray Setup - Comprehensive Menu
            // TODO: Use IconMenuItem once we have distinct icons. For now using standard MenuItem with placeholders where icons would be.
            let show_i = MenuItem::with_id(app, "show", "Show RSI Assistant", true, None::<&str>)?;
            let rest_break_i = MenuItem::with_id(app, "rest_break", "Take Rest Break Now", true, None::<&str>)?;
            let exercises_i = MenuItem::with_id(app, "exercises", "Exercises", true, None::<&str>)?;
            let statistics_i = MenuItem::with_id(app, "statistics", "Statistics", true, None::<&str>)?;

            // Operation Mode submenu
            // Default to Normal being checked
            let mode_normal_i = CheckMenuItem::with_id(app, "mode_normal", "Normal", true, true, None::<&str>)?;
            let mode_quiet_i = CheckMenuItem::with_id(app, "mode_quiet", "Quiet", true, false, None::<&str>)?;
            let mode_suspended_i = CheckMenuItem::with_id(app, "mode_suspended", "Suspended", true, false, None::<&str>)?;

            let mode_submenu = Submenu::with_items(app, "Mode", true, &[
                &mode_normal_i,
                &mode_quiet_i,
                &mode_suspended_i,
            ])?;

            let preferences_i = MenuItem::with_id(app, "preferences", "Preferences", true, None::<&str>)?;
            let about_i = MenuItem::with_id(app, "about", "About", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

            let menu = Menu::with_items(app, &[
                &show_i,
                &PredefinedMenuItem::separator(app)?,
                &rest_break_i,
                &exercises_i,
                &statistics_i,
                &PredefinedMenuItem::separator(app)?,
                &mode_submenu,
                &preferences_i,
                &about_i,
                &PredefinedMenuItem::separator(app)?,
                &quit_i,
            ])?;

            // Capture handles for event closure
            let mode_normal_handle = mode_normal_i.clone();
            let mode_quiet_handle = mode_quiet_i.clone();
            let mode_suspended_handle = mode_suspended_i.clone();

            let _tray = TrayIconBuilder::with_id("tray")
                .menu(&menu)
                .icon(app.default_window_icon().unwrap().clone())
                .show_menu_on_left_click(true)
                .on_menu_event(move |app, event| {
                    let window = app.get_webview_window("main");

                    match event.id.as_ref() {
                        "quit" => {
                            app.exit(0);
                        }
                        "show" => {
                            if let Some(win) = window {
                                let _ = win.show();
                                let _ = win.set_focus();
                            }
                        }
                        "about" => {
                            let _ = app.dialog().message("RSI Recovery Assistant\n\nA tool to help you prevent Repetitive Strain Injury.\n\nVersion: 0.1.0");
                        }
                        "rest_break" => {
                            if let Some(win) = window {
                                let _ = win.show();
                                let _ = win.set_focus();
                            }
                            let state = app.state::<AppState>();
                            let mut service = state.timer_service.lock().unwrap();
                            service.trigger_rest_break();
                        }
                        "exercises" => {
                            if let Some(win) = window {
                                let _ = win.show();
                                let _ = win.set_focus();
                                let _ = win.emit("navigate-to", "exercises");
                            }
                        }
                        "statistics" => {
                            if let Some(win) = window {
                                let _ = win.show();
                                let _ = win.set_focus();
                                let _ = win.emit("navigate-to", "statistics");
                            }
                        }
                        "preferences" => {
                            if let Some(win) = window {
                                let _ = win.show();
                                let _ = win.set_focus();
                                let _ = win.emit("navigate-to", "settings");
                            }
                        }
                        "mode_normal" => {
                             let state = app.state::<AppState>();
                             let mut service = state.timer_service.lock().unwrap();
                             service.set_mode(timer::OperationMode::Normal);

                             let _ = mode_normal_handle.set_checked(true);
                             let _ = mode_quiet_handle.set_checked(false);
                             let _ = mode_suspended_handle.set_checked(false);
                        }
                        "mode_quiet" => {
                             let state = app.state::<AppState>();
                             let mut service = state.timer_service.lock().unwrap();
                             service.set_mode(timer::OperationMode::Quiet);

                             let _ = mode_normal_handle.set_checked(false);
                             let _ = mode_quiet_handle.set_checked(true);
                             let _ = mode_suspended_handle.set_checked(false);
                        }
                         "mode_suspended" => {
                             let state = app.state::<AppState>();
                             let mut service = state.timer_service.lock().unwrap();
                             service.set_mode(timer::OperationMode::Suspended);

                             let _ = mode_normal_handle.set_checked(false);
                             let _ = mode_quiet_handle.set_checked(false);
                             let _ = mode_suspended_handle.set_checked(true);
                        }
                        _ => {}
                    }
                })
                .build(app)?;

            // Clone handle for background task
            let handle = app.handle().clone();

use tauri_plugin_notification::NotificationExt;

// ... imports ...

// ... inside run() setup ...

            // Spawn background task
            tauri::async_runtime::spawn(async move {
                use crate::idle::IdleDetector;

                let mut was_micro_overdue = false;
                let mut was_rest_overdue = false;

                loop {
                    sleep(Duration::from_secs(1)).await;

                    let idle_seconds = idle_detector.get_seconds_since_last_input();
                    let is_idle = idle_seconds > 5; // Simple threshold

                    let status = {
                        let state = handle.state::<AppState>();
                        let mut service = state.timer_service.lock().unwrap();
                        service.tick(is_idle);
                        let status = service.get_status();

                        // Update statistics with current usage
                        let mut stats = state.stats_store.lock().unwrap();
                        let today = stats.get_or_create_today();
                        today.total_usage_seconds = status.daily_usage;

                        status
                    };

                    // Notifications
                    if status.micro_is_overdue && !was_micro_overdue {
                        let _ = handle.notification().builder()
                            .title("Microbreak Time")
                            .body("Take a short 30s break!")
                            .show();
                    }
                    if status.rest_is_overdue && !was_rest_overdue {
                         let _ = handle.notification().builder()
                            .title("Rest Break Time")
                            .body("Time for a longer rest.")
                            .show();
                    }
                    was_micro_overdue = status.micro_is_overdue;
                    was_rest_overdue = status.rest_is_overdue;

                    // Emit event to frontend
                    if let Err(e) = handle.emit("timer-update", status) {
                        eprintln!("Failed to emit timer update: {}", e);
                    }

                    // Manage Overlay Window
                    if let Some(overlay) = handle.get_webview_window("overlay") {
                        let should_show = status.micro_is_overdue || status.rest_is_overdue;
                        // To avoid excessive IPC calls, we could track state, but for now simple show/hide logic
                        if should_show {
                            // Ensure it's visible and on top
                            // We use unwrap_or to ignore errors gracefully in the loop
                            let _ = overlay.show();
                            let _ = overlay.set_focus();
                            let _ = overlay.set_always_on_top(true);
                        } else {
                             let _ = overlay.hide();
                        }
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_timer_state,
            commands::update_settings,
            commands::get_settings,
            commands::get_statistics,
            commands::record_break_taken,
            commands::record_break_postponed,
            commands::reset_break
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                window.hide().unwrap();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
