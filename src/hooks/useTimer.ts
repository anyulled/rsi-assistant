import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import type { TimerStatus } from "@/types";

import { invoke } from "@tauri-apps/api/core";

export function useTimer() {
  const [status, setStatus] = useState<TimerStatus | null>(null);

  useEffect(() => {
    // Fetch initial state
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
