import type { BreakConfig, TimerStatus } from "./types";

export const DEFAULT_TIMER_STATUS: TimerStatus = Object.freeze({
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
});

export const DEFAULT_BREAK_CONFIG: BreakConfig = Object.freeze({
  microbreakInterval: 180,
  microbreakDuration: 20,
  restInterval: 2700,
  restDuration: 300,
  dailyLimit: 28800,
  microbreakEnabled: false,
  restEnabled: false,
  dailyEnabled: false,
  warningDuration: 0,
  mode: "Normal",
});
