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

/** Slots are numbered from 1 and capped so the tick-off sheet stays usable. */
export const MAX_TIMES_PER_DAY = 12;

export type SlotDeadline = 'endOfDay' | 'onTime';

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  schedule: HabitSchedule;
  /**
   * How many times a day it has to be done. 1 for almost everything; 8 for
   * glasses of water.
   *
   * Slots are identified by their *number*, never by the reminder attached to
   * them — a reminder can be re-timed or deleted, and history has to survive
   * both. Sorted reminders label slots in order, so four slots with two
   * reminders means slots 1 and 2 show a time and 3 and 4 don't.
   */
  timesPerDay: number;
  /**
   * When an unticked slot counts as missed.
   *
   * - `endOfDay` — anything goes until midnight. Right for water: nobody has a
   *   deadline for the fourth glass, and the reminders are nudges, not verdicts.
   * - `onTime`   — a slot is missed once the next one is due, the last at
   *   midnight. Right for medication, where the timing is the point.
   *
   * Only ever differs *during* the current day; by midnight both agree.
   */
  slotDeadline: SlotDeadline;
  /** Free text shown on the habit and used as the alarm's body. */
  notes: string;
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
  /**
   * Which slot this alarm belongs to, on a habit due more than once a day.
   *
   * Bound explicitly rather than inferred by sorting the times: with `onTime`
   * a slot number carries a deadline, so re-timing one reminder must not
   * silently re-order the slots and change what past ticks meant.
   */
  slot?: number;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  log_date: string; // yyyy-MM-dd
  /**
   * Which slots were done, for habits due more than once a day. Absent on
   * single-slot habits, which behave exactly as they did before slots existed.
   *
   * The row is deleted once this empties, so "no row at all" still means
   * nothing was done — several statistics depend on that.
   */
  slots?: number[];
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
