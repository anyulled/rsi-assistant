# Architecture Overview

The RSI Recovery Assistant consists of two main layers:

1. **Frontend (React + TypeScript)**
   - Built with Vite and Tailwind CSS.
   - UI components are based on `shadcn/ui` and customized for a macOS look.
   - Communicates with the Rust backend via Tauri commands and event listeners.

2. **Backend (Rust + Tauri)**
   - Core logic lives in `src-tauri/src/`.
   - **Idle detection** (`idle/mod.rs`) uses the `device_query` crate to poll mouse/keyboard activity.
   - **Timer service** (`timer/mod.rs`) implements the state machine for micro‑breaks, rest breaks, and daily limits.
   - **Commands** (`commands.rs`) expose `get_timer_state`, `update_settings`, and `get_settings` to the frontend.
   - **Plugins**: Store (settings persistence), Notification (macOS alerts), Autostart, FS, Opener.

The backend runs a background async task that:

- Checks idle status every second.
- Calls `TimerService::tick(is_idle)`.
- Emits a `timer-update` event with the current `TimerStatus`.

The frontend listens for this event to update progress bars and trigger UI notifications.
