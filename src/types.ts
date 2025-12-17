export type OperationMode = "Normal" | "Quiet" | "Suspended";

export interface BreakConfig {
  microbreak_interval: number;
  microbreak_duration: number;
  microbreak_enabled: boolean;
  rest_interval: number;
  rest_duration: number;
  rest_enabled: boolean;
  daily_limit: number;
  daily_enabled: boolean;
  warning_duration: number;
  mode: OperationMode;
}

export interface TimerStatus {
  daily_usage: number;
  daily_limit: number;
  micro_active: number;
  micro_target: number;
  micro_is_overdue: boolean;
  rest_active: number;
  rest_target: number;
  rest_is_overdue: boolean;
  current_idle: number;
  mode: OperationMode;
}
