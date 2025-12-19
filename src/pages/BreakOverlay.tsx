import { useEffect, useState, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { useTimer } from "@/hooks/useTimer";
import type { BreakConfig } from "@/types";

export function BreakOverlay() {
  const status = useTimer();
  const [breakDuration, setBreakDuration] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [settings, setSettings] = useState<BreakConfig | null>(null);
  const submittedRef = useRef(false);

  // Fetch settings on mount to get actual break durations
  useEffect(() => {
    invoke<BreakConfig>("get_settings")
      .then((config) => {
        setSettings(config);
      })
      .catch((error) => {
        console.error("Failed to load settings:", error);
      });
  }, []);

  // Compute break type and message from status (derived state, no need for useState)
  const { breakType, message, targetDuration } = (() => {
    if (!status) return { breakType: null, message: "Time for a break!", targetDuration: 0 };
    if (status.micro_is_overdue && !status.rest_is_overdue) {
      return {
        breakType: "micro" as const,
        message: "Microbreak Time!",
        targetDuration: settings?.microbreak_duration || 20,
      };
    }
    if (status.rest_is_overdue) {
      return {
        breakType: "rest" as const,
        message: "Rest Break Time!",
        targetDuration: settings?.rest_duration || 300,
      };
    }
    return { breakType: null, message: "Time for a break!", targetDuration: 0 };
  })();

  // Track whether a break is active and its locked-in duration
  const prevBreakTypeRef = useRef<"micro" | "rest" | null>(null);

  // Handle break transitions: lock in duration when break starts, reset when break ends
  // This is an intentional effect to synchronize internal state when external status transitions
  useEffect(() => {
    if (breakType && !prevBreakTypeRef.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBreakDuration(targetDuration);
      setElapsedTime(0);
      submittedRef.current = false;
    } else if (!breakType && prevBreakTypeRef.current) {
      setBreakDuration(0);
      setElapsedTime(0);
      submittedRef.current = false;
    }
    prevBreakTypeRef.current = breakType;
  }, [breakType, targetDuration]);

  // Track elapsed time during break
  useEffect(() => {
    // Don't start timer if duration is invalid
    if (breakDuration <= 0) return;

    const interval = setInterval(() => {
      setElapsedTime((prev) => {
        const next = prev + 1;
        // Cap at break duration
        if (next >= breakDuration) {
          return breakDuration;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [breakDuration]);

  // Helper to close window reliably
  const closeWindow = useCallback(async () => {
    try {
      await getCurrentWindow().hide();
    } catch (e) {
      console.error("Failed to hide window:", e);
    }
  }, []);

  const handleBreakComplete = useCallback(async () => {
    if (!breakType || submittedRef.current) return;

    submittedRef.current = true;
    try {
      await invoke("record_break_taken", { breakType });
      await invoke("reset_break", { breakType });
    } catch (error) {
      console.error("Failed to record break completion:", error);
      submittedRef.current = false; // Retry on failure
    }
    await closeWindow();
  }, [breakType, closeWindow]);

  const handleSkip = useCallback(async () => {
    if (!breakType) {
      // If we don't know the type, try to guess or just hide
      await closeWindow();
      return;
    }

    try {
      await invoke("record_break_postponed", { breakType });
      await invoke("reset_break", { breakType });
    } catch (error) {
      console.error("Failed to record postponed break:", error);
    }
    await closeWindow();
  }, [breakType, closeWindow]);

  // Auto-complete break when duration is reached
  useEffect(() => {
    if (breakDuration > 0 && elapsedTime >= breakDuration) {
      handleBreakComplete();
    }
  }, [elapsedTime, breakDuration, handleBreakComplete]);

  const activeDuration = breakDuration > 0 ? breakDuration : targetDuration;
  const progress = activeDuration > 0 ? Math.max(0, ((activeDuration - elapsedTime) / activeDuration) * 100) : 0;
  const remainingSeconds = Math.max(0, activeDuration - elapsedTime);
  const remainingMinutes = Math.floor(remainingSeconds / 60);
  const remainingSecondsDisplay = remainingSeconds % 60;

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-black/80 text-white select-none">
      <h1 className="text-4xl font-bold mb-4">{message}</h1>
      <p className="text-lg mb-8">Take a moment to stretch and look away from the screen.</p>

      {/* Break Progress */}
      <div className="mb-8 w-96">
        <div className="flex justify-between mb-2 text-sm">
          <span>Break Progress</span>
          <span>
            {remainingMinutes}:{remainingSecondsDisplay.toString().padStart(2, "0")} remaining
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-4 flex justify-end overflow-hidden">
          <div
            data-testid="progress-bar"
            className="bg-green-500 h-4 rounded-full transition-all duration-1000"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">Break will complete automatically</p>
      </div>

      <button onClick={handleSkip} className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-colors">
        Skip Break
      </button>
    </div>
  );
}
