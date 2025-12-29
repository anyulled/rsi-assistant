import type { TimerStatus } from "@/types";
import { Calendar, Clock, Coffee, Hand } from "lucide-react";

interface CircularProgressProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  isOverdue?: boolean;
}

function CircularProgress({ value, max, size = 120, strokeWidth = 8, color = "#3b82f6", isOverdue = false }: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const safeValue = isNaN(value) || value < 0 ? 0 : value;
  const safeMax = isNaN(max) || max <= 0 ? 1 : max;
  const percentage = Math.min((safeValue / safeMax) * 100, 100);
  const offset = circumference - (percentage / 100) * circumference;

  const displayColor = isOverdue ? "#f97316" : color;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="currentColor" strokeWidth={strokeWidth} fill="none" className="text-muted/20" />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={displayColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-gray-900 dark:text-white">{Math.floor(safeValue)}</span>
        <span className="text-xs text-gray-600 dark:text-gray-300">/ {safeMax}s</span>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  // Handle invalid values
  if (typeof seconds !== "number" || isNaN(seconds) || seconds < 0) {
    return "0:00";
  }

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function TimerDisplay({ status }: { status: TimerStatus }) {
  const handleTakeBreak = async (breakType: "micro" | "rest") => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("trigger_break", { breakType });
    } catch (error) {
      console.error("Failed to trigger break:", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-8 select-none">
      {/* Mode Badge and Manual Break Buttons */}
      <div className="flex items-center gap-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium">
          <Clock className="w-4 h-4" />
          Mode: {status.mode}
        </div>
        <button
          onClick={() => handleTakeBreak("micro")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 text-sm font-medium hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
        >
          <Hand className="w-4 h-4" />
          Take Micro-break
        </button>
        <button
          onClick={() => handleTakeBreak("rest")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-sm font-medium hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
        >
          <Coffee className="w-4 h-4" />
          Take Rest Break
        </button>
      </div>

      {/* Progress Circles Grid */}
      <div className="grid grid-cols-3 gap-12 w-full max-w-3xl">
        {/* Microbreak */}
        <div className="flex flex-col items-center space-y-3">
          <CircularProgress value={status.microActive} max={status.microTarget} color="#10b981" isOverdue={status.microIsOverdue} />
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
              <Hand className="w-4 h-4" />
              Micro-break
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {formatTime(status.microActive)} / {formatTime(status.microTarget)}
            </div>
            {status.microIsOverdue && <div className="text-xs text-orange-500 font-medium mt-1">Overdue!</div>}
          </div>
        </div>

        {/* Rest Break */}
        <div className="flex flex-col items-center space-y-3">
          <CircularProgress value={status.restActive} max={status.restTarget} color="#8b5cf6" isOverdue={status.restIsOverdue} />
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
              <Coffee className="w-4 h-4" />
              Rest break
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {formatTime(status.restActive)} / {formatTime(status.restTarget)}
            </div>
            {status.restIsOverdue && <div className="text-xs text-orange-500 font-medium mt-1">Overdue!</div>}
          </div>
        </div>

        {/* Daily Limit */}
        <div className="flex flex-col items-center space-y-3">
          <CircularProgress value={status.dailyUsage} max={status.dailyLimit} color="#3b82f6" />
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
              <Calendar className="w-4 h-4" />
              Daily limit
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {formatTime(status.dailyUsage)} / {formatTime(status.dailyLimit)}
            </div>
          </div>
        </div>
      </div>

      {/* Current Idle Status */}
      <div className="flex items-center gap-2 px-4 py-2 rounded-md bg-gray-100 dark:bg-gray-800 text-sm">
        <span className="text-gray-600 dark:text-gray-400">Current idle:</span>
        <span className="font-semibold text-gray-900 dark:text-white">{formatTime(status.currentIdle)}</span>
      </div>
    </div>
  );
}
