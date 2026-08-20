import {
  addDays,
  addWeeks,
  differenceInCalendarDays,
  format,
  isBefore,
  parseISO,
  startOfDay,
  startOfWeek,
} from 'date-fns';
import { DEFAULT_SCHEDULE } from '../types';
import type { Habit, HabitLog, HabitReminder, HabitSchedule } from '../types';

/**
 * Everything here reasons about *when a habit was actually due* rather than
 * about days in general.
 *
 * A habit due on Mondays and Thursdays is not failing the other five days, and
 * counting those as misses is what made streaks meaningless for anything other
 * than a daily habit.
 */

/** Weeks start Monday, matching the grid and the rest of the app. */
const WEEK_OPTS = { weekStartsOn: 1 as const };

export function scheduleOf(habit: Habit): HabitSchedule {
  return habit.schedule ?? { ...DEFAULT_SCHEDULE };
}

const dateKey = (d: Date) => format(d, 'yyyy-MM-dd');

/** Dates the habit was done on. */
function doneDates(logs: HabitLog[]): Set<string> {
  return new Set(logs.filter((l) => l.completed).map((l) => l.log_date));
}

/**
 * Custom dates still ahead of us (today counts). Dates that have passed are
 * dropped whether or not they were done — the habit shouldn't keep asking for
 * a day that's gone.
 */
export function upcomingCustomDates(schedule: HabitSchedule, now: Date = new Date()): string[] {
  if (schedule.period !== 'custom') return [];
  const today = dateKey(now);
  return schedule.dates.filter((d) => d >= today).sort();
}

/** A custom habit whose dates have all passed — finished, not deleted. */
export function isFinished(habit: Habit, now: Date = new Date()): boolean {
  const schedule = scheduleOf(habit);
  return schedule.period === 'custom' && upcomingCustomDates(schedule, now).length === 0;
}

/** Was the habit due on this date at all? */
export function isDueOn(habit: Habit, date: Date): boolean {
  const schedule = scheduleOf(habit);
  if (isBefore(startOfDay(date), startOfDay(parseISO(habit.created_at)))) return false;

  if (schedule.period === 'day') return true;
  if (schedule.period === 'custom') return schedule.dates.includes(dateKey(date));
  // Weekly with no specific days: any day can count toward the total, so no
  // single day is "not due".
  if (schedule.weekdays.length === 0) return true;
  return schedule.weekdays.includes(date.getDay());
}

export interface PeriodProgress {
  done: number;
  target: number;
  satisfied: boolean;
  remaining: number;
  /** What the period is called in the UI — "today", "this week". */
  label: string;
}

/** Progress through the period containing `on`. */
export function progressFor(habit: Habit, logs: HabitLog[], on: Date = new Date()): PeriodProgress {
  const schedule = scheduleOf(habit);
  const doneOn = doneDates(logs);

  if (schedule.period === 'day') {
    const done = doneOn.has(dateKey(on)) ? 1 : 0;
    return { done, target: 1, satisfied: done >= 1, remaining: 1 - done, label: 'today' };
  }

  if (schedule.period === 'custom') {
    // Measured over the dates still to come, so a finished habit reads 0 of 0.
    const upcoming = upcomingCustomDates(schedule, on);
    const done = upcoming.filter((d) => doneOn.has(d)).length;
    const target = upcoming.length;
    return {
      done,
      target,
      satisfied: target > 0 && done >= target,
      remaining: Math.max(0, target - done),
      label: 'left',
    };
  }

  const weekStart = startOfWeek(on, WEEK_OPTS);
  const days = [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(weekStart, i));
  const target =
    schedule.weekdays.length > 0 ? schedule.weekdays.length : Math.max(1, schedule.times);
  const done =
    schedule.weekdays.length > 0
      ? days.filter((d) => schedule.weekdays.includes(d.getDay()) && doneOn.has(dateKey(d))).length
      : days.filter((d) => doneOn.has(dateKey(d))).length;
  return {
    done,
    target,
    satisfied: done >= target,
    remaining: Math.max(0, target - done),
    label: 'this week',
  };
}

/** True when the whole period containing `on` was satisfied. */
function periodSatisfied(habit: Habit, logs: HabitLog[], on: Date): boolean {
  return progressFor(habit, logs, on).satisfied;
}

/**
 * Consecutive satisfied periods ending with the current one. The period in
 * progress never breaks the streak — a weekly habit isn't failing on Tuesday
 * just because the week isn't finished.
 */
export function periodStreak(habit: Habit, logs: HabitLog[], now: Date = new Date()): number {
  const schedule = scheduleOf(habit);
  const created = parseISO(habit.created_at);
  const doneOn = doneDates(logs);

  if (schedule.period === 'custom') {
    // Consecutive expected dates hit, walking back from the most recent past one.
    const past = schedule.dates.filter((d) => d <= dateKey(now)).sort().reverse();
    let streak = 0;
    for (const d of past) {
      if (doneOn.has(d)) streak += 1;
      else break;
    }
    return streak;
  }

  let streak = 0;
  for (let i = 0; i < 800; i += 1) {
    const cursor = schedule.period === 'day' ? addDays(now, -i) : addWeeks(now, -i);
    if (differenceInCalendarDays(cursor, created) < 0) break;
    if (periodSatisfied(habit, logs, cursor)) {
      streak += 1;
      continue;
    }
    if (i === 0) continue; // current period still open
    break;
  }
  return streak;
}

/** Finished periods that fell short. Excludes the one in progress. */
export function missedPeriods(habit: Habit, logs: HabitLog[], now: Date = new Date()): number {
  const schedule = scheduleOf(habit);
  const created = parseISO(habit.created_at);
  const doneOn = doneDates(logs);

  if (schedule.period === 'custom') {
    return schedule.dates.filter((d) => d < dateKey(now) && !doneOn.has(d)).length;
  }

  let missed = 0;
  for (let i = 1; i < 800; i += 1) {
    const cursor = schedule.period === 'day' ? addDays(now, -i) : addWeeks(now, -i);
    if (differenceInCalendarDays(cursor, created) < 0) break;
    if (!periodSatisfied(habit, logs, cursor)) missed += 1;
  }
  return missed;
}

/** Satisfied periods over periods elapsed — 0..1. */
export function periodCompletionPct(habit: Habit, logs: HabitLog[], now: Date = new Date()): number {
  const schedule = scheduleOf(habit);
  const created = parseISO(habit.created_at);
  const doneOn = doneDates(logs);

  if (schedule.period === 'custom') {
    const past = schedule.dates.filter((d) => d <= dateKey(now));
    if (past.length === 0) return 0;
    return past.filter((d) => doneOn.has(d)).length / past.length;
  }

  let elapsed = 0;
  let satisfied = 0;
  for (let i = 0; i < 800; i += 1) {
    const cursor = schedule.period === 'day' ? addDays(now, -i) : addWeeks(now, -i);
    if (differenceInCalendarDays(cursor, created) < 0) break;
    elapsed += 1;
    if (periodSatisfied(habit, logs, cursor)) satisfied += 1;
  }
  return elapsed === 0 ? 0 : satisfied / elapsed;
}

/**
 * How many times the habit has been due since it was created — the honest
 * denominator for "completed vs goal".
 */
export function expectedOccurrences(habit: Habit, now: Date = new Date()): number {
  const schedule = scheduleOf(habit);
  const created = startOfDay(parseISO(habit.created_at));
  const days = Math.max(0, differenceInCalendarDays(startOfDay(now), created)) + 1;

  if (schedule.period === 'day') return days;
  if (schedule.period === 'custom') {
    const today = dateKey(now);
    return schedule.dates.filter((d) => d <= today).length;
  }
  const weeks = Math.max(1, Math.ceil(days / 7));
  const perWeek = schedule.weekdays.length > 0 ? schedule.weekdays.length : Math.max(1, schedule.times);
  return weeks * perWeek;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "Every day", "Mon, Thu", "4 dates" — the rule in words. */
export function describeSchedule(schedule: HabitSchedule): string {
  if (schedule.period === 'day') return 'Every day';
  if (schedule.period === 'custom') {
    const n = schedule.dates.length;
    return n === 0 ? 'No dates chosen' : n === 1 ? '1 date' : `${n} dates`;
  }
  if (schedule.weekdays.length > 0) {
    return [...schedule.weekdays].sort().map((d) => DAY_NAMES[d]).join(', ');
  }
  const times = Math.max(1, schedule.times);
  return times === 1 ? 'Once a week' : times === 2 ? 'Twice a week' : `${times} times a week`;
}

/** "1 of 2 this week", "3 of 4 left". */
export function describeProgress(progress: PeriodProgress): string {
  return `${progress.done} of ${progress.target} ${progress.label}`;
}

/** Whether the progress line is worth showing at all. */
export function hasNonTrivialSchedule(habit: Habit): boolean {
  return scheduleOf(habit).period !== 'day';
}

/**
 * The longest run of consecutive satisfied periods in the habit's history.
 *
 * Counted in periods, not days, so a habit due Mon/Thu can exceed a streak of
 * two — the day-based version topped out there because Tuesday broke the run.
 */
export function longestPeriodStreak(habit: Habit, logs: HabitLog[], now: Date = new Date()): number {
  const schedule = scheduleOf(habit);
  const created = parseISO(habit.created_at);
  const doneOn = doneDates(logs);

  if (schedule.period === 'custom') {
    const past = schedule.dates.filter((d) => d <= dateKey(now)).sort();
    let best = 0;
    let run = 0;
    for (const d of past) {
      run = doneOn.has(d) ? run + 1 : 0;
      best = Math.max(best, run);
    }
    return best;
  }

  let best = 0;
  let run = 0;
  for (let i = 0; i < 800; i += 1) {
    const cursor = schedule.period === 'day' ? addDays(now, -i) : addWeeks(now, -i);
    if (differenceInCalendarDays(cursor, created) < 0) break;
    // Walking backwards, so a run here is a run forwards too — only its length
    // matters, not which end it started at.
    run = periodSatisfied(habit, logs, cursor) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

/**
 * Consecutive missed periods ending with the most recent *finished* one, or 0
 * once the current period is satisfied.
 *
 * The period in progress is deliberately excluded rather than counted as a
 * miss — the same reasoning as [periodStreak]. A weekly habit showing "losing
 * streak: 1" every Monday morning would contradict the whole point of
 * scheduling: it isn't failing yet, the week has barely started.
 */
export function missedPeriodStreak(habit: Habit, logs: HabitLog[], now: Date = new Date()): number {
  if (periodSatisfied(habit, logs, now)) return 0;

  const schedule = scheduleOf(habit);
  const created = parseISO(habit.created_at);
  const doneOn = doneDates(logs);

  if (schedule.period === 'custom') {
    const past = schedule.dates.filter((d) => d < dateKey(now)).sort().reverse();
    let streak = 0;
    for (const d of past) {
      if (doneOn.has(d)) break;
      streak += 1;
    }
    return streak;
  }

  let streak = 0;
  for (let i = 1; i < 800; i += 1) {
    const cursor = schedule.period === 'day' ? addDays(now, -i) : addWeeks(now, -i);
    if (differenceInCalendarDays(cursor, created) < 0) break;
    if (periodSatisfied(habit, logs, cursor)) break;
    streak += 1;
  }
  return streak;
}

/** What one period is called, for labelling stats — "day", "week", "date". */
export function periodNoun(habit: Habit): string {
  const period = scheduleOf(habit).period;
  return period === 'day' ? 'day' : period === 'week' ? 'week' : 'date';
}

// ---------------------------------------------------------------------------
// Habits due more than once a day
// ---------------------------------------------------------------------------

/** Slot numbers for a habit, 1..timesPerDay. */
export function slotsOf(habit: Habit): number[] {
  const n = Math.max(1, habit.timesPerDay ?? 1);
  return Array.from({ length: n }, (_, i) => i + 1);
}

export function isMultiSlot(habit: Habit): boolean {
  return Math.max(1, habit.timesPerDay ?? 1) > 1;
}

/**
 * Slots ticked on a date. A row saved before slots existed means the whole day
 * was done, which is slot 1.
 */
export function slotsDoneOn(logs: HabitLog[], date: Date | string): number[] {
  const key = typeof date === 'string' ? date : dateKey(date);
  const log = logs.find((l) => l.log_date === key);
  if (!log) return [];
  return log.slots ?? (log.completed ? [1] : []);
}

/** Minutes past midnight for 'HH:mm', or null if it isn't a usable time. */
function minutesOf(time: string | undefined): number | null {
  if (!time) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/**
 * When a slot stops being available, in minutes past midnight.
 *
 * Under `onTime` a slot is missed once the *next* one is due — the alarm rings
 * at a slot's own time, so treating that moment as the deadline would mark it
 * failed at the instant it was asked for. The last slot, and anything with no
 * later time, runs to midnight.
 *
 * Deliberately read from the reminder *times* rather than from whether a
 * notification actually fired: alarms have a global off switch, and turning it
 * off must not make streaks unbreakable.
 */
export function slotDeadlineMinutes(habit: Habit, reminders: HabitReminder[], slot: number): number {
  const END_OF_DAY = 24 * 60;
  if ((habit.slotDeadline ?? 'endOfDay') === 'endOfDay') return END_OF_DAY;

  const later = slotsOf(habit)
    .filter((n) => n > slot)
    .map((n) => minutesOf(reminders.find((r) => r.slot === n)?.time))
    .filter((m): m is number => m !== null);

  return later.length > 0 ? Math.min(...later) : END_OF_DAY;
}

/** Has this slot's window closed on the given day? Past days are always closed. */
export function isSlotClosed(
  habit: Habit,
  reminders: HabitReminder[],
  slot: number,
  date: Date,
  now: Date = new Date()
): boolean {
  const today = dateKey(now);
  const key = dateKey(date);
  if (key < today) return true;
  if (key > today) return false;
  const elapsed = now.getHours() * 60 + now.getMinutes();
  return elapsed >= slotDeadlineMinutes(habit, reminders, slot);
}

/**
 * Consecutive slots done, counting back from now and stopping at the first one
 * whose window closed unticked.
 *
 * Slots still open today are skipped rather than counted as missed. Without
 * that the number would read zero every morning and nobody would trust it.
 */
export function slotStreak(
  habit: Habit,
  logs: HabitLog[],
  reminders: HabitReminder[],
  now: Date = new Date()
): number {
  const created = parseISO(habit.created_at);
  const slots = slotsOf(habit);
  let streak = 0;

  for (let i = 0; i < 400; i += 1) {
    const day = addDays(now, -i);
    if (differenceInCalendarDays(day, created) < 0) break;
    if (!isDueOn(habit, day)) continue;

    const done = new Set(slotsDoneOn(logs, day));
    for (let s = slots.length - 1; s >= 0; s -= 1) {
      const slot = slots[s];
      if (done.has(slot)) {
        streak += 1;
        continue;
      }
      // Still open — hasn't been missed yet, so it neither counts nor breaks.
      if (!isSlotClosed(habit, reminders, slot, day, now)) continue;
      return streak;
    }
  }
  return streak;
}
