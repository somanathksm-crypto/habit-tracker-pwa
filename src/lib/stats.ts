import {
  addDays,
  differenceInCalendarDays,
  format,
  getDay,
  getDaysInMonth,
  isAfter,
  isBefore,
  parseISO,
  startOfMonth,
} from 'date-fns';
import { expectedOccurrences, isDueOn, missedPeriodStreak, periodNoun } from './habitSchedule';
import type { Habit, HabitLog, Metric, MetricLog, MetricTarget } from '../types';

export const todayStr = () => format(new Date(), 'yyyy-MM-dd');

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function completedDateSet(logs: HabitLog[]): Set<string> {
  return new Set(logs.filter((l) => l.completed).map((l) => l.log_date));
}

function occurrencesOfWeekday(weekday: number, createdAt: string): number {
  const created = parseISO(createdAt);
  const totalDays = Math.max(1, differenceInCalendarDays(new Date(), created) + 1);
  let count = 0;
  for (let i = 0; i < totalDays; i++) {
    if (getDay(addDays(created, i)) === weekday) count += 1;
  }
  return count;
}

export interface HabitNudge {
  text: string;
  tone: 'warning' | 'neutral' | 'info';
}

/**
 * A single forward-looking nudge line, prioritized:
 * 1. Currently on a 2+ period miss streak — the strongest warning, since this
 *    is where a missed habit starts turning into a new (bad) habit.
 * 2. Missed just the one period — reassurance, not alarm.
 * 3. Otherwise (on track), look ahead to tomorrow: if the last time this
 *    weekday came up it was missed, nudge before it repeats. Needs 2+ past
 *    occurrences of that weekday so it's a pattern, not a fluke.
 *
 * Counted in the habit's own periods. Measured in days, a habit due Mon/Thu
 * was told it had "missed 3 days straight" every Wednesday, which is the
 * single most visible place that lie showed up.
 */
export function habitNudge(habit: Habit, logs: HabitLog[]): HabitNudge | null {
  const noun = periodNoun(habit);
  const missedStreak = missedPeriodStreak(habit, logs);
  if (missedStreak >= 2) {
    return { text: `Missed ${missedStreak} ${noun}s straight — don't let it become the new habit.`, tone: 'warning' };
  }
  if (missedStreak === 1) {
    return { text: `One missed ${noun} is fine — just don't make it two in a row.`, tone: 'neutral' };
  }

  const done = completedDateSet(logs);
  const created = parseISO(habit.created_at);
  const tomorrow = addDays(new Date(), 1);
  const tomorrowDay = getDay(tomorrow);
  const lastOccurrence = addDays(tomorrow, -7);
  // Only worth saying if the habit is actually due tomorrow, and was due the
  // last time this weekday came round — otherwise it's nagging about a day it
  // was never asked to show up for.
  if (!isDueOn(habit, tomorrow)) return null;
  if (isBefore(lastOccurrence, created)) return null;
  if (!isDueOn(habit, lastOccurrence)) return null;
  if (done.has(format(lastOccurrence, 'yyyy-MM-dd'))) return null;
  if (occurrencesOfWeekday(tomorrowDay, habit.created_at) < 2) return null;

  return {
    text: `You missed last ${DAY_NAMES[tomorrowDay]} — don't miss it again this ${DAY_NAMES[tomorrowDay]}.`,
    tone: 'info',
  };
}

/** Shared shape of anything tracked toward a numeric target over time — both WeightTarget and MetricTarget satisfy this structurally. */
export interface TrackedTarget {
  start_value: number;
  target_value: number;
  start_date: string;
  target_date: string;
}

/** Linear interpolation between start and target weight for a given date. */
export function expectedWeightOn(target: TrackedTarget, dateStr: string): number {
  const start = parseISO(target.start_date).getTime();
  const end = parseISO(target.target_date).getTime();
  const at = parseISO(dateStr).getTime();
  if (end === start) return target.target_value;
  const t = Math.min(1, Math.max(0, (at - start) / (end - start)));
  return target.start_value + t * (target.target_value - target.start_value);
}

export interface DayOfWeekPoint {
  date: string; // yyyy-MM-dd
  label: string; // 'Mon', 'Tue', ...
  completed: number;
  goal: number;
  future: boolean;
}

export interface WeekOfMonthPoint {
  label: string; // 'Aug 1st week', 'Aug 2nd week', ...
  completed: number;
  goal: number;
  days: DayOfWeekPoint[];
}

function ordinal(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return `${n}st`;
  if (n % 10 === 2 && n % 100 !== 12) return `${n}nd`;
  if (n % 10 === 3 && n % 100 !== 13) return `${n}rd`;
  return `${n}th`;
}

/**
 * Given month (default: current) split into 7-day chunks from day 1
 * (matches the user's spreadsheet's "Week 1/2/3/4/5" convention, not
 * calendar/ISO weeks). Only includes weeks that have started (no all-zero
 * future weeks for the current month; a fully past month includes every week).
 *
 * `goal` for a day is how many habits were actually *due* that day, not the
 * total habit count. Counting every habit every day made anything less than
 * daily look permanently behind, and credited days before a habit even
 * existed with a goal it had no way to meet.
 */
export function monthlyWeekBreakdown(
  habits: Habit[],
  allLogs: HabitLog[],
  referenceDate: Date = new Date()
): WeekOfMonthPoint[] {
  const completedByDate = new Map<string, number>();
  for (const log of allLogs) {
    if (!log.completed) continue;
    completedByDate.set(log.log_date, (completedByDate.get(log.log_date) ?? 0) + 1);
  }

  const today = new Date();
  const monthStart = startOfMonth(referenceDate);
  const daysInMonth = getDaysInMonth(referenceDate);

  const weeks: WeekOfMonthPoint[] = [];
  for (let dayIdx = 0; dayIdx < daysInMonth; dayIdx += 7) {
    const weekStart = addDays(monthStart, dayIdx);
    if (isAfter(weekStart, today)) break;

    const daysThisWeek = Math.min(7, daysInMonth - dayIdx);
    let completed = 0;
    let weekGoal = 0;
    const days: DayOfWeekPoint[] = [];
    for (let d = 0; d < daysThisWeek; d++) {
      const date = addDays(monthStart, dayIdx + d);
      const dateStr = format(date, 'yyyy-MM-dd');
      const future = isAfter(date, today);
      const dayCompleted = future ? 0 : (completedByDate.get(dateStr) ?? 0);
      const dayGoal = habits.filter((h) => isDueOn(h, date)).length;
      completed += dayCompleted;
      weekGoal += dayGoal;
      days.push({ date: dateStr, label: format(date, 'EEE'), completed: dayCompleted, goal: dayGoal, future });
    }
    const weekLabel = `${format(monthStart, 'MMM')} ${ordinal(dayIdx / 7 + 1)} week`;
    weeks.push({ label: weekLabel, completed, goal: weekGoal, days });
  }
  return weeks;
}

export interface GlobalProgress {
  completed: number;
  goal: number;
  left: number;
}

/** All-time completed vs. goal across every habit — mirrors the spreadsheet's top-level Completed/Goal/Left summary. */
export function globalProgress(habits: Habit[], allLogs: HabitLog[]): GlobalProgress {
  const completed = allLogs.filter((l) => l.completed).length;
  // The goal is how many times each habit was actually due since it was
  // created — counting every elapsed day would make anything less than daily
  // look permanently behind.
  const goal = habits.reduce((sum, h) => sum + expectedOccurrences(h), 0);
  return { completed, goal, left: Math.max(0, goal - completed) };
}

export type WeightPace = 'ahead' | 'on-track' | 'behind' | 'unknown';

export function weightPace(target: TrackedTarget, currentValue: number): WeightPace {
  const expected = expectedWeightOn(target, todayStr());
  const losingWeight = target.target_value < target.start_value;
  const diff = currentValue - expected;
  const tolerance = Math.max(0.3, Math.abs(target.target_value - target.start_value) * 0.03);
  if (Math.abs(diff) <= tolerance) return 'on-track';
  const ahead = losingWeight ? diff < 0 : diff > 0;
  return ahead ? 'ahead' : 'behind';
}

export interface MetricsOverview {
  tracked: number;
  onTrack: number;
  behind: number;
}

/** Counts metrics by pace, for the Performance hub's insight strip. Metrics with no target or no logs yet don't count toward either bucket. */
export function metricsOverview(metrics: Metric[], metricLogs: MetricLog[], metricTargets: MetricTarget[]): MetricsOverview {
  let onTrack = 0;
  let behind = 0;
  for (const metric of metrics) {
    const target = metricTargets.find((t) => t.metric_id === metric.id);
    if (!target) continue;
    const logs = metricLogs.filter((l) => l.metric_id === metric.id).sort((a, b) => a.log_date.localeCompare(b.log_date));
    const current = logs[logs.length - 1];
    if (!current) continue;
    const pace = weightPace(target, current.value);
    if (pace === 'ahead' || pace === 'on-track') onTrack += 1;
    else if (pace === 'behind') behind += 1;
  }
  return { tracked: metrics.length, onTrack, behind };
}

/** Best (max if higherIsBetter, else min) value ever logged, or null if there are no logs. */
export function bestMetricValue(logs: MetricLog[], higherIsBetter: boolean): number | null {
  if (logs.length === 0) return null;
  return logs.reduce(
    (best, l) => (higherIsBetter ? Math.max(best, l.value) : Math.min(best, l.value)),
    higherIsBetter ? -Infinity : Infinity
  );
}

/**
 * True if `newValue` strictly beats the best of `priorLogs`. A first-ever
 * log (empty `priorLogs`) is a baseline, not a PR — nothing to beat yet.
 * Ties do not count as a PR.
 */
export function isMetricPersonalRecord(priorLogs: MetricLog[], newValue: number, higherIsBetter: boolean): boolean {
  const best = bestMetricValue(priorLogs, higherIsBetter);
  if (best === null) return false;
  return higherIsBetter ? newValue > best : newValue < best;
}

/** Consecutive days (ending today, or yesterday if today isn't logged yet) with at least one log for this metric — independent of value or any target. */
export function metricLoggingStreak(logs: MetricLog[]): number {
  const logged = new Set(logs.map((l) => l.log_date));
  let cursor = new Date();
  if (!logged.has(format(cursor, 'yyyy-MM-dd'))) {
    cursor = addDays(cursor, -1);
  }
  let streak = 0;
  while (logged.has(format(cursor, 'yyyy-MM-dd'))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

