import { addDays, format, isAfter, startOfDay } from 'date-fns';
import { isDueOn, progressFor } from './habitSchedule';
import type { Habit, HabitLog, HabitReminder } from '../types';

/**
 * How far ahead firing times are worked out, as a span of days rather than a
 * count of firings.
 *
 * A firing count gives a habit due twice a week the same buffer in *alarms* as
 * a daily one, which is a quarter of the buffer in days — exactly backwards,
 * since the sparse habit is the one whose next alarm is furthest away. The
 * global cap below takes the soonest alarms across every reminder, so a
 * generous span costs nothing when the queue is busy and buys real buffer when
 * it isn't.
 */
const LOOKAHEAD_DAYS = 60;

/**
 * Total alarms handed to the OS.
 *
 * A bigger queue buys more days of buffer for an app that goes unopened, at
 * the cost of a slower first sync (every entry is a separate call into the OS).
 * Syncing only ever adds what's missing now, so a slow first fill is no longer
 * dangerous — but it is still work, hence not unbounded. iOS is capped lower
 * because it silently drops anything past 64 pending notifications.
 */
export const MAX_SCHEDULED_IOS = 50;
export const MAX_SCHEDULED_ANDROID = 100;

export interface Occurrence {
  reminder: HabitReminder;
  date: Date;
}

function parseTime(time: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

function at(day: Date, hour: number, minute: number): Date {
  const d = startOfDay(day);
  d.setHours(hour, minute, 0, 0);
  return d;
}

/**
 * Future firing times for one reminder, earliest first. Only times strictly
 * after `from` are returned, so an alarm never lands in the past.
 *
 * The *days* come from the habit's own schedule: a reminder is a time of day,
 * not a rule of its own. A habit due Mon/Thu therefore cannot be nagged on a
 * Tuesday, and a habit whose custom dates have all passed stops ringing by
 * itself.
 */
export function occurrencesFor(habit: Habit, reminder: HabitReminder, from: Date): Date[] {
  const parsed = parseTime(reminder.time);
  if (!parsed) return [];
  const { hour, minute } = parsed;

  const out: Date[] = [];
  let day = startOfDay(from);
  for (let i = 0; i <= LOOKAHEAD_DAYS; i += 1) {
    const when = at(day, hour, minute);
    if (isAfter(when, from) && isDueOn(habit, day)) out.push(when);
    day = addDays(day, 1);
  }
  return out;
}

/** Logs grouped by habit, since the schedule helpers take one habit's logs. */
function groupLogs(habitLogs: HabitLog[]): Map<string, HabitLog[]> {
  const byHabit = new Map<string, HabitLog[]>();
  for (const log of habitLogs) {
    const existing = byHabit.get(log.habit_id);
    if (existing) existing.push(log);
    else byHabit.set(log.habit_id, [log]);
  }
  return byHabit;
}

/**
 * Every alarm that should currently be registered with the OS, earliest first
 * and capped at [MAX_SCHEDULED].
 *
 * Alarms are skipped once there's nothing left to ask for — which is the whole
 * reason firings are computed here rather than handed to the OS as a repeating
 * trigger, since a repeating trigger can't skip a single occurrence. Two
 * separate conditions, and both are needed:
 *
 * - **that date is already done** — the plain case, and the only one that
 *   catches a custom-date habit ticked earlier the same day, whose period
 *   spans every date still to come and so isn't satisfied by one of them.
 * - **the period containing it is already satisfied** — so "any 2 days a week"
 *   rings daily until the second is ticked and then goes quiet for the rest of
 *   the week, rather than nagging through a week it has already met.
 */
export function plannedOccurrences(
  habits: Habit[],
  reminders: HabitReminder[],
  habitLogs: HabitLog[],
  from: Date = new Date(),
  limit: number = MAX_SCHEDULED_IOS
): Occurrence[] {
  const habitsById = new Map(habits.map((h) => [h.id, h]));
  const logsByHabit = groupLogs(habitLogs);

  const all: Occurrence[] = [];
  for (const reminder of reminders) {
    const habit = habitsById.get(reminder.habit_id);
    // A reminder can outlive its habit if data was edited oddly — drop it.
    if (!habit) continue;

    // A reminder bound to a slot beyond the habit's current count is kept in
    // the data — lowering "times a day" shouldn't discard times you typed — but
    // it must not ring for a slot that no longer exists.
    if (reminder.slot && reminder.slot > Math.max(1, habit.timesPerDay ?? 1)) continue;

    const logs = logsByHabit.get(habit.id) ?? [];
    const done = new Set(logs.filter((l) => l.completed).map((l) => l.log_date));

    for (const date of occurrencesFor(habit, reminder, from)) {
      if (done.has(format(date, 'yyyy-MM-dd'))) continue;
      if (progressFor(habit, logs, date).satisfied) continue;
      all.push({ reminder, date });
    }
  }

  return all.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, limit);
}
