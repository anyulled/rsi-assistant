import type { TimerStatus } from "@/types";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";

import { invoke } from "@tauri-apps/api/core";

// Default status prevents null checks throughout the codebase
const DEFAULT_TIMER_STATUS: TimerStatus = {
  dailyUsage: 0,
  dailyLimit: 28800, // 8 hours default
  microActive: 0,
  microTarget: 180, // 3 minutes default
  microIsOverdue: false,
  restActive: 0,
  restTarget: 2700, // 45 minutes default
  restIsOverdue: false,
  currentIdle: 0,
  mode: "Normal",
  breakType: null,
  breakDuration: 0,
  breakElapsed: 0,
};

export function useTimer(): TimerStatus {
  const [status, setStatus] = useState<TimerStatus>(DEFAULT_TIMER_STATUS);

  useEffect(() => {
    // Fetch initial state from backend
    invoke<TimerStatus>("get_timer_state").then(setStatus).catch(console.error);

    // Listen for timer updates from the backend
    const unlisten = listen<TimerStatus>("timer-update", (event) => {
      setStatus(event.payload);
    });
    // Cleanup on unmount
    return () => {
      unlisten.then((fn) => fn()).catch(() => {});
    };
  }, []);

  return status;
}
