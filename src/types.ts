export type HabitCategory = 'diet' | 'skincare' | 'supplement' | 'general';
export type FrequencyType = 'daily' | 'weekly' | 'custom';

/** How the main habits screen is laid out — chosen on first launch, changeable in Settings. */
export type HabitView = 'cards' | 'grid';

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  category: HabitCategory;
  frequency_type: FrequencyType;
  target_count: number | null;
  created_at: string; // ISO timestamp
}

/**
 * When a reminder repeats. `weekdays` uses 0=Sunday…6=Saturday.
 * `monthly.day` is capped at 28 so it exists in every month.
 */
export type ReminderRepeat =
  | { kind: 'daily' }
  | { kind: 'weekly'; weekdays: number[] }
  | { kind: 'monthly'; day: number }
  | { kind: 'once'; date: string }; // 'yyyy-MM-dd'

export const MAX_MONTHLY_DAY = 28;

/** One alarm for a habit. A habit can have as many as the user wants. */
export interface HabitReminder {
  id: string;
  habit_id: string;
  time: string; // 'HH:mm', 24-hour, local device time
  repeat: ReminderRepeat;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  log_date: string; // yyyy-MM-dd
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

export const HABIT_CATEGORIES: { value: HabitCategory; label: string }[] = [
  { value: 'diet', label: 'Diet' },
  { value: 'skincare', label: 'Skincare' },
  { value: 'supplement', label: 'Supplements' },
  { value: 'general', label: 'General' },
];

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
