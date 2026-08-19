/** How the main habits screen is laid out — chosen on first launch, changeable in Settings. */
export type HabitView = 'cards' | 'grid';

export type HabitPeriod = 'day' | 'week' | 'custom';

/**
 * When a habit is due.
 *
 * - `day`    — every day, `times` per day (a tablet three times daily)
 * - `week`   — either specific weekdays, or any `times` days in the week
 * - `custom` — explicit dates, one-off. Dates that have passed are dropped, so
 *              the habit stops asking for days that are gone.
 *
 * Knowing *which* days were expected is what lets the app stop treating every
 * untouched day as a failure.
 */
export type HabitSchedule =
  | { period: 'day' }
  | { period: 'week'; times: number; weekdays: number[] } // 0=Sun…6=Sat; empty means any `times` days
  | { period: 'custom'; dates: string[] }; // yyyy-MM-dd

export const DEFAULT_SCHEDULE: HabitSchedule = { period: 'day' };

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  schedule: HabitSchedule;
  created_at: string; // ISO timestamp
}

/**
 * One alarm for a habit — just a time of day.
 *
 * Which days it rings on comes from the habit's own `schedule`, not from the
 * reminder. Two competing notions of when a habit happens meant a Mon/Thu
 * habit could be given a daily alarm and nag on days the grid correctly showed
 * it was never due.
 */
export interface HabitReminder {
  id: string;
  habit_id: string;
  time: string; // 'HH:mm', 24-hour, local device time
}

export interface HabitLog {
  id: string;
  habit_id: string;
  log_date: string; // yyyy-MM-dd
  /**
   * A day is done or it isn't. Something due several times a day is better
   * modelled as separate habits — one per time — so each gets its own alarm
   * and its own history, showing which of them you actually keep missing.
   */
  completed: boolean;
}

export interface WeightLog {
  id: string;
  user_id: string;
  log_date: string; // yyyy-MM-dd
  value: number;
}

export interface WeightTarget {
  user_id: string;
  start_value: number;
  target_value: number;
  start_date: string; // yyyy-MM-dd
  target_date: string; // yyyy-MM-dd
}


export interface Metric {
  id: string;
  user_id: string;
  name: string; // e.g. "Pushup count", "5k run time"
  unit: string; // free-text, e.g. "reps", "min", "kg"
  higher_is_better: boolean; // true: bigger = improvement (reps, weight lifted); false: smaller = improvement (race time)
  created_at: string; // ISO timestamp
}

export interface MetricLog {
  id: string;
  metric_id: string;
  log_date: string; // yyyy-MM-dd
  value: number;
}

export interface MetricTarget {
  metric_id: string; // one row per metric, unlike WeightTarget's user_id-keyed singleton
  start_value: number;
  target_value: number;
  start_date: string; // yyyy-MM-dd
  target_date: string; // yyyy-MM-dd
}
