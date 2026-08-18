import {
  addDays,
  differenceInCalendarDays,
  format,
  getDay,
  getDaysInMonth,
  isAfter,
  isBefore,
  parseISO,
  startOfISOWeek,
  startOfMonth,
} from 'date-fns';
import type { Habit, HabitLog, Metric, MetricLog, MetricTarget } from '../types';

export const todayStr = () => format(new Date(), 'yyyy-MM-dd');

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function completedDateSet(logs: HabitLog[]): Set<string> {
  return new Set(logs.filter((l) => l.completed).map((l) => l.log_date));
}

/** Consecutive completed days ending today (or yesterday, if today isn't logged yet). */
export function currentStreak(logs: HabitLog[]): number {
  const done = completedDateSet(logs);
  let cursor = new Date();
  if (!done.has(format(cursor, 'yyyy-MM-dd'))) {
    cursor = addDays(cursor, -1);
  }
  let streak = 0;
  while (done.has(format(cursor, 'yyyy-MM-dd'))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Consecutive missed days ending today — 0 if today is already completed. */
export function currentMissedStreak(logs: HabitLog[], createdAt: string): number {
  const done = completedDateSet(logs);
  const created = parseISO(createdAt);
  if (done.has(todayStr())) return 0;
  let streak = 0;
  let cursor = new Date();
  while (!done.has(format(cursor, 'yyyy-MM-dd')) && !isBefore(cursor, created)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Longest run of consecutive completed calendar days across all history. */
export function longestStreak(logs: HabitLog[]): number {
  const dates = [...completedDateSet(logs)]
    .map((d) => parseISO(d))
    .sort((a, b) => a.getTime() - b.getTime());
  if (dates.length === 0) return 0;
  let best = 1;
  let run = 1;
  for (let i = 1; i < dates.length; i++) {
    if (differenceInCalendarDays(dates[i], dates[i - 1]) === 1) {
      run += 1;
    } else {
      run = 1;
    }
    best = Math.max(best, run);
  }
  return best;
}

/** Completion % vs target_count if set, else vs days elapsed since creation. */
export function completionPct(habit: Habit, logs: HabitLog[]): number {
  const completed = logs.filter((l) => l.completed).length;
  const denominator =
    habit.target_count && habit.target_count > 0
      ? habit.target_count
      : Math.max(1, differenceInCalendarDays(new Date(), parseISO(habit.created_at)) + 1);
  return Math.min(1, completed / denominator);
}

export interface WeeklyRollupPoint {
  weekStart: string; // yyyy-MM-dd
  completed: number;
  daysElapsed: number; // days of that week that have already happened (max 7) — the real denominator
}

/**
 * Completion counts grouped by ISO week, oldest first. Rate should be
 * completed/daysElapsed, not completed/logged — a day with no tap has no
 * log at all (there's no stored completed:false), so completed and
 * logged counts are always equal, which would make every active week
 * read as 100%.
 */
export function weeklyRollup(logs: HabitLog[]): WeeklyRollupPoint[] {
  const byWeek = new Map<string, number>();
  for (const log of logs) {
    if (!log.completed) continue;
    const weekStart = format(startOfISOWeek(parseISO(log.log_date)), 'yyyy-MM-dd');
    byWeek.set(weekStart, (byWeek.get(weekStart) ?? 0) + 1);
  }
  const today = new Date();
  return [...byWeek.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, completed]) => {
      const start = parseISO(weekStart);
      const weekEnd = addDays(start, 6);
      const effectiveEnd = weekEnd < today ? weekEnd : today;
      const daysElapsed = Math.max(1, differenceInCalendarDays(effectiveEnd, start) + 1);
      return { weekStart, completed, daysElapsed };
    });
}

export interface DayOfWeekStat {
  dayName: string;
  rate: number;
}

/**
 * Completion rate per day-of-week, over every occurrence of that weekday
 * since the habit was created (not just days with a log — a day with no
 * tap has no log at all, so counting only logged days would make every
 * day-of-week that has any activity read as 100%).
 */
function dayOfWeekBreakdown(logs: HabitLog[], createdAt: string): DayOfWeekStat[] {
  const done = completedDateSet(logs);
  const created = parseISO(createdAt);
  const totalDays = Math.max(1, differenceInCalendarDays(new Date(), created) + 1);

  const byDay = new Map<number, { completed: number; occurrences: number }>();
  for (let i = 0; i < totalDays; i++) {
    const date = addDays(created, i);
    const day = getDay(date);
    const entry = byDay.get(day) ?? { completed: 0, occurrences: 0 };
    entry.occurrences += 1;
    if (done.has(format(date, 'yyyy-MM-dd'))) entry.completed += 1;
    byDay.set(day, entry);
  }

  return [...byDay.entries()]
    .filter(([, v]) => v.occurrences > 0)
    .map(([day, v]) => ({ dayName: DAY_NAMES[day], rate: v.completed / v.occurrences }));
}

/** Day-of-week with the highest completion rate. */
export function bestDayOfWeek(logs: HabitLog[], createdAt: string): DayOfWeekStat | null {
  const stats = dayOfWeekBreakdown(logs, createdAt);
  return stats.reduce<DayOfWeekStat | null>((best, s) => (!best || s.rate > best.rate ? s : best), null);
}

/** Day-of-week with the lowest completion rate. */
export function worstDayOfWeek(logs: HabitLog[], createdAt: string): DayOfWeekStat | null {
  const stats = dayOfWeekBreakdown(logs, createdAt);
  return stats.reduce<DayOfWeekStat | null>((worst, s) => (!worst || s.rate < worst.rate ? s : worst), null);
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
 * 1. Currently on a 2+ day miss streak — the strongest warning, since this
 *    is where a missed habit starts turning into a new (bad) habit.
 * 2. Missed just today/yesterday (streak of 1) — reassurance, not alarm.
 * 3. Otherwise (on track today), look ahead to tomorrow: if the last time
 *    this weekday came up it was missed, nudge before it repeats. Needs
 *    2+ past occurrences of that weekday so it's a pattern, not a fluke.
 */
export function habitNudge(logs: HabitLog[], createdAt: string): HabitNudge | null {
  const missedStreak = currentMissedStreak(logs, createdAt);
  if (missedStreak >= 2) {
    return { text: `Missed ${missedStreak} days straight — don't let it become the new habit.`, tone: 'warning' };
  }
  if (missedStreak === 1) {
    return { text: `One missed day is fine — just don't make it two in a row.`, tone: 'neutral' };
  }

  const done = completedDateSet(logs);
  const created = parseISO(createdAt);
  const tomorrow = addDays(new Date(), 1);
  const tomorrowDay = getDay(tomorrow);
  const lastOccurrence = addDays(tomorrow, -7);
  if (isBefore(lastOccurrence, created)) return null;
  if (done.has(format(lastOccurrence, 'yyyy-MM-dd'))) return null;
  if (occurrencesOfWeekday(tomorrowDay, createdAt) < 2) return null;

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
 * calendar/ISO weeks). `goal` per day is total habit count — every habit
 * is expected daily, same convention as the Today screen's completed/
 * total ring. Only includes weeks that have started (no all-zero future
 * weeks for the current month; a fully past month includes every week).
 */
export function monthlyWeekBreakdown(
  habitCount: number,
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
    const days: DayOfWeekPoint[] = [];
    for (let d = 0; d < daysThisWeek; d++) {
      const date = addDays(monthStart, dayIdx + d);
      const dateStr = format(date, 'yyyy-MM-dd');
      const future = isAfter(date, today);
      const dayCompleted = future ? 0 : (completedByDate.get(dateStr) ?? 0);
      completed += dayCompleted;
      days.push({ date: dateStr, label: format(date, 'EEE'), completed: dayCompleted, goal: habitCount, future });
    }
    const weekLabel = `${format(monthStart, 'MMM')} ${ordinal(dayIdx / 7 + 1)} week`;
    weeks.push({ label: weekLabel, completed, goal: habitCount * daysThisWeek, days });
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
  const goal = habits.reduce((sum, h) => {
    const denom =
      h.target_count && h.target_count > 0
        ? h.target_count
        : Math.max(1, differenceInCalendarDays(new Date(), parseISO(h.created_at)) + 1);
    return sum + denom;
  }, 0);
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

/** Every completed habit log + every logged metric value, all-time — the single "did the work" signal driving avatar growth. */
export function totalCompletions(habitLogs: HabitLog[], metricLogs: MetricLog[]): number {
  return habitLogs.filter((l) => l.completed).length + metricLogs.length;
}

export interface AvatarStageInfo {
  stage: 1 | 2 | 3 | 4 | 5;
  label: 'Lean' | 'Building' | 'Toned' | 'Strong' | 'Peak';
  completions: number;
  nextThreshold: number | null; // completions needed to reach the next stage; null at Peak
}

const AVATAR_STAGES: { stage: 1 | 2 | 3 | 4 | 5; label: AvatarStageInfo['label']; min: number }[] = [
  { stage: 1, label: 'Lean', min: 0 },
  { stage: 2, label: 'Building', min: 15 },
  { stage: 3, label: 'Toned', min: 40 },
  { stage: 4, label: 'Strong', min: 80 },
  { stage: 5, label: 'Peak', min: 150 },
];

export function avatarStageInfo(habitLogs: HabitLog[], metricLogs: MetricLog[]): AvatarStageInfo {
  const completions = totalCompletions(habitLogs, metricLogs);
  const current = [...AVATAR_STAGES].reverse().find((s) => completions >= s.min)!;
  const next = AVATAR_STAGES.find((s) => s.stage === current.stage + 1);
  return { stage: current.stage, label: current.label, completions, nextThreshold: next?.min ?? null };
}
