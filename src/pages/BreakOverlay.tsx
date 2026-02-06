import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useCallback, useEffect } from "react";

import { useTimer } from "@/hooks/useTimer";

export function BreakOverlay() {
  const status = useTimer();

  // Debug logging to understand what we're receiving
  useEffect(() => {
    console.log("BreakOverlay status received:", JSON.stringify(status, null, 2));
  }, [status]);

  // Derive break info from backend status
  const breakType = status.breakType;
  const breakDuration = status.breakDuration;
  const breakElapsed = status.breakElapsed;

  console.log("Break state:", { breakType, breakDuration, breakElapsed });

  // Determine message based on break type
  const message = breakType === "rest" ? "Rest Break Time!" : breakType === "micro" ? "Microbreak Time!" : "Time for a break!";

  // Helper to close window reliably
  const closeWindow = useCallback(async () => {
    try {
      await getCurrentWindow().hide();
    } catch (e) {
      console.error("Failed to hide window:", e);
    }
  }, []);

  const handleBreakComplete = useCallback(async () => {
    if (!breakType) return;

    try {
      await invoke("record_break_taken", { breakType });
      await invoke("reset_break", { breakType });
    } catch (error) {
      console.error("Failed to record break completion:", error);
    }
    await closeWindow();
  }, [breakType, closeWindow]);

  const handleSkip = useCallback(async () => {
    if (!breakType) {
      // If we don't know the type, just hide
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
  // This is now handled by watching the backend elapsed time
  const isBreakComplete = breakDuration > 0 && breakElapsed >= breakDuration;

  useEffect(() => {
    if (isBreakComplete) {
      handleBreakComplete();
    }
  }, [isBreakComplete, handleBreakComplete]);

  // Calculate progress and remaining time from backend data
  const remainingSeconds = Math.max(0, breakDuration - breakElapsed);
  const progress = breakDuration > 0 ? (remainingSeconds / breakDuration) * 100 : 100;
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
