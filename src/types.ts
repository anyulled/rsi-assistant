export type OperationMode = "Normal" | "Quiet" | "Suspended";

export interface BreakConfig {
  microbreakInterval: number;
  microbreakDuration: number;
  microbreakEnabled: boolean;
  restInterval: number;
  restDuration: number;
  restEnabled: boolean;
  dailyLimit: number;
  dailyEnabled: boolean;
  warningDuration: number;
  mode: OperationMode;
}

export interface TimerStatus {
  dailyUsage: number;
  dailyLimit: number;
  microActive: number;
  microTarget: number;
  microIsOverdue: boolean;
  restActive: number;
  restTarget: number;
  restIsOverdue: boolean;
  currentIdle: number;
  mode: OperationMode;
  // Active break state
  breakType: "micro" | "rest" | null;
  breakDuration: number;
  breakElapsed: number;
}
