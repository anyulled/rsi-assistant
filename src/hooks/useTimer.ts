import type { TimerStatus } from "@/types";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";

import { invoke } from "@tauri-apps/api/core";

// Default status prevents null checks throughout the codebase
import { DEFAULT_TIMER_STATUS } from "../constants";

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
