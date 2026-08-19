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
import type { Habit, HabitLog, HabitSchedule } from '../types';

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
