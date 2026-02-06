mod commands;
mod idle;
mod stats;
mod timer;

use crate::commands::AppState;
use crate::idle::DeviceQueryIdleDetector;
use crate::stats::StatsStore;
use crate::timer::{BreakConfig, TimerService};
use chrono::Datelike;
use std::sync::Mutex;
use std::time::Duration;
use tauri::image::Image;
use tauri::menu::{IconMenuItem, Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::tray::TrayIconBuilder;
use tauri::{Emitter, Listener, Manager};
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
            let idle_detector = match DeviceQueryIdleDetector::new() {
                Ok(detector) => detector,
                Err(err_msg) => {
                    // Notify the user about missing permissions so they know how to fix it and why the app is stopping.
                    use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};
                    use tauri_plugin_opener::OpenerExt;

                    let dialog_message = format!(
                        "{}\\n\\n\
                        This app needs Accessibility permissions to monitor your activity and remind you to take breaks.\\n\\n\
                        To enable:\\n\
                        1. Open System Settings\\n\
                        2. Go to Privacy & Security > Accessibility\\n\
                        3. Enable access for RSI Assistant\\n\\n\
                        Would you like to open System Settings now?",
                        err_msg
                    );

                    let app_handle = app.handle().clone();
                    tauri::async_runtime::block_on(async move {
                        let result = app_handle
                            .dialog()
                            .message(dialog_message)
                            .title("Accessibility Permissions Required")
                            .kind(MessageDialogKind::Warning)
                            .buttons(MessageDialogButtons::OkCancelCustom(
                                "Open Settings".to_string(),
                                "Quit".to_string(),
                            ))
                            .blocking_show();

                        if result {
                            let _ = app_handle.opener().open_url(
                                "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility",
                                None::<&str>,
                            );
                        }

                        // Exit the app either way since it can't function without permissions
                        app_handle.exit(1);
                    });

                    // This line won't be reached, but needed for type checking
                    return Err("Accessibility permissions not granted".into());
                }
            };

            let timer_service = TimerService::new(BreakConfig::default());

            app.manage(AppState {
                timer_service: Mutex::new(timer_service),
                stats_store: Mutex::new(StatsStore::default()),
            });

            use tauri::menu::CheckMenuItem;
            use tauri_plugin_dialog::DialogExt;

            macro_rules! create_icon_menu_item {
                ($app:expr, $id:expr, $text:expr, $icon_path:literal) => {{
                    let icon = Image::from_bytes(include_bytes!($icon_path))
                        .expect(&format!("Failed to load icon: {}", $icon_path));
                    IconMenuItem::with_id($app, $id, $text, true, Some(icon), None::<&str>)
                }};
            }

            let show_i = create_icon_menu_item!(
                app,
                "show",
                "Show RSI Assistant",
                "../icons/menu_show.png"
            )?;
            let rest_break_i = create_icon_menu_item!(
                app,
                "rest_break",
                "Take Rest Break Now",
                "../icons/menu_rest.png"
            )?;
            let exercises_i =
                create_icon_menu_item!(app, "exercises", "Exercises", "../icons/menu_exercises.png")?;
            let statistics_i =
                create_icon_menu_item!(app, "statistics", "Statistics", "../icons/menu_stats.png")?;

            // Start in Normal mode as the default behavior.
            let mode_normal_i =
                CheckMenuItem::with_id(app, "mode_normal", "Normal", true, true, None::<&str>)?;
            let mode_quiet_i =
                CheckMenuItem::with_id(app, "mode_quiet", "Quiet", true, false, None::<&str>)?;
            let mode_suspended_i = CheckMenuItem::with_id(
                app,
                "mode_suspended",
                "Suspended",
                true,
                false,
                None::<&str>,
            )?;
            let mode_reading_i = CheckMenuItem::with_id(
                app,
                "mode_reading",
                "Reading",
                true,
                false,
                None::<&str>,
            )?;

            let mode_submenu = Submenu::with_items(
                app,
                "Mode",
                true,
                &[
                    &mode_normal_i,
                    &mode_quiet_i,
                    &mode_suspended_i,
                    &mode_reading_i,
                ],
            )?;

            let preferences_i =
                MenuItem::with_id(app, "preferences", "Preferences", true, None::<&str>)?;
            let about_i = MenuItem::with_id(app, "about", "About", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

            let menu = Menu::with_items(
                app,
                &[
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
                ],
            )?;

            let mode_normal_handle = mode_normal_i.clone();
            let mode_quiet_handle = mode_quiet_i.clone();
            let mode_suspended_handle = mode_suspended_i.clone();
            let mode_reading_handle = mode_reading_i.clone();

            let mode_normal_handle_l = mode_normal_i.clone();
            let mode_quiet_handle_l = mode_quiet_i.clone();
            let mode_suspended_handle_l = mode_suspended_i.clone();
            let mode_reading_handle_l = mode_reading_i.clone();

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
                            let about_message = format!(
                                "RSI Recovery Assistant\n\n\
                                A tool to help you prevent Repetitive Strain Injury by \
                                reminding you to take regular breaks and providing exercises.\n\n\
                                Version: {}\n\
                                Developer: Anyul Rivas\n\
                                License: MIT\n\
                                Copyright © {} Anyul Rivas\n\n\
                                Built with Tauri and Rust",
                                app.package_info().version,
                                chrono::Utc::now().year()
                            );
                            let _ = app.dialog().message(about_message);
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
                            let _ = mode_reading_handle.set_checked(false);
                            let _ = app.emit("app-mode-changed", "Normal");
                        }
                        "mode_quiet" => {
                            let state = app.state::<AppState>();
                            let mut service = state.timer_service.lock().unwrap();
                            service.set_mode(timer::OperationMode::Quiet);

                            let _ = mode_normal_handle.set_checked(false);
                            let _ = mode_quiet_handle.set_checked(true);
                            let _ = mode_suspended_handle.set_checked(false);
                            let _ = mode_reading_handle.set_checked(false);
                            let _ = app.emit("app-mode-changed", "Quiet");
                        }
                        "mode_suspended" => {
                            let state = app.state::<AppState>();
                            let mut service = state.timer_service.lock().unwrap();
                            service.set_mode(timer::OperationMode::Suspended);

                            let _ = mode_normal_handle.set_checked(false);
                            let _ = mode_quiet_handle.set_checked(false);
                            let _ = mode_suspended_handle.set_checked(true);
                            let _ = mode_reading_handle.set_checked(false);
                            let _ = app.emit("app-mode-changed", "Suspended");
                        }
                        "mode_reading" => {
                            let state = app.state::<AppState>();
                            let mut service = state.timer_service.lock().unwrap();
                            service.set_mode(timer::OperationMode::Reading);

                            let _ = mode_normal_handle.set_checked(false);
                            let _ = mode_quiet_handle.set_checked(false);
                            let _ = mode_suspended_handle.set_checked(false);
                            let _ = mode_reading_handle.set_checked(true);
                            let _ = app.emit("app-mode-changed", "Reading");
                        }
                        _ => {}
                    }
                })
                .build(app)?;

            // Keep the tray menu in sync with mode changes made from the settings UI.
            app.listen("app-mode-changed", move |event| {
                if let Ok(mode_str) = serde_json::from_str::<String>(event.payload()) {
                    let _ = mode_normal_handle_l.set_checked(mode_str == "Normal");
                    let _ = mode_quiet_handle_l.set_checked(mode_str == "Quiet");
                    let _ = mode_suspended_handle_l.set_checked(mode_str == "Suspended");
                    let _ = mode_reading_handle_l.set_checked(mode_str == "Reading");
                }
            });

            let handle = app.handle().clone();

            use tauri_plugin_notification::NotificationExt;

            // Spawn background task
            tauri::async_runtime::spawn(async move {
                use crate::idle::IdleDetector;

                let mut was_micro_overdue = false;
                let mut was_rest_overdue = false;
                let mut is_overlay_visible: Option<bool> = None;

                loop {
                    sleep(Duration::from_secs(1)).await;

                    let idle_seconds = idle_detector.get_seconds_since_last_input();
                    let is_idle = idle_seconds > 5; // Prevent flickering by requiring sustained inactivity.

                    let status = {
                        let state = handle.state::<AppState>();
                        let mut service = state.timer_service.lock().unwrap();
                        service.tick(is_idle);

                        let preliminary_status = service.get_status();
                        if (preliminary_status.micro_is_overdue
                            || preliminary_status.rest_is_overdue)
                            && preliminary_status.break_type.is_none()
                        {
                            if preliminary_status.rest_is_overdue {
                                service.start_break(crate::timer::BreakType::Rest);
                            } else if preliminary_status.micro_is_overdue {
                                service.start_break(crate::timer::BreakType::Micro);
                            }
                        }

                        let status = service.get_status();

                        let mut stats = state.stats_store.lock().unwrap();
                        let today = stats.get_or_create_today();
                        today.total_usage_seconds = status.daily_usage;

                        status
                    };

                    if status.micro_is_overdue && !was_micro_overdue {
                        let _ = handle
                            .notification()
                            .builder()
                            .title("Microbreak Time")
                            .body("Take a short 30s break!")
                            .show();
                    }
                    if status.rest_is_overdue && !was_rest_overdue {
                        let _ = handle
                            .notification()
                            .builder()
                            .title("Rest Break Time")
                            .body("Time for a longer rest.")
                            .show();
                    }
                    was_micro_overdue = status.micro_is_overdue;
                    was_rest_overdue = status.rest_is_overdue;

                    if status.break_type.is_some() || status.micro_is_overdue || status.rest_is_overdue {
                        println!(
                            "[DEBUG] Emitting timer-update: break_type={:?}, break_duration={}, break_elapsed={}",
                            status.break_type, status.break_duration, status.break_elapsed
                        );
                    }

                    if let Err(e) = handle.emit("timer-update", status) {
                        eprintln!("Failed to emit timer update: {}", e);
                    }

                    if let Some(overlay) = handle.get_webview_window("overlay") {
                        // Show overlay when a break is in progress
                        let should_show = status.break_type.is_some();

                        if is_overlay_visible.map_or(true, |v| v != should_show) {
                            if should_show {
                                // Ensure it's visible and on top
                                let _ = overlay.show();
                                let _ = overlay.set_focus();
                                let _ = overlay.set_always_on_top(true);
                            } else {
                                let _ = overlay.hide();
                            }
                            is_overlay_visible = Some(should_show);
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
            commands::delete_statistics,
            commands::record_break_taken,
            commands::record_break_postponed,
            commands::reset_break,
            commands::set_mode,
            commands::trigger_break
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
