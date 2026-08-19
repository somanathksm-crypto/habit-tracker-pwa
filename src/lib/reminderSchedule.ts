import { addDays, addMonths, format, isAfter, setDate, startOfDay } from 'date-fns';
import type { HabitLog, HabitReminder } from '../types';

/**
 * How many future firings we work out per reminder before the global cap is
 * applied. Sized so the buffer is sensible whatever the repeat rule is:
 * 14 days for a daily alarm, 14 weeks for a weekly one, 14 months for monthly.
 */
const PER_REMINDER_LOOKAHEAD = 14;

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
 * Future firing times for one reminder, earliest first. Only dates strictly
 * after `from` are returned, so an alarm never lands in the past.
 */
export function occurrencesFor(reminder: HabitReminder, from: Date): Date[] {
  const parsed = parseTime(reminder.time);
  if (!parsed) return [];
  const { hour, minute } = parsed;
  const repeat = reminder.repeat;
  const out: Date[] = [];

  if (repeat.kind === 'once') {
    const [y, m, d] = repeat.date.split('-').map(Number);
    if (!y || !m || !d) return [];
    const when = at(new Date(y, m - 1, d), hour, minute);
    return isAfter(when, from) ? [when] : [];
  }

  if (repeat.kind === 'daily') {
    let day = startOfDay(from);
    while (out.length < PER_REMINDER_LOOKAHEAD) {
      const when = at(day, hour, minute);
      if (isAfter(when, from)) out.push(when);
      day = addDays(day, 1);
    }
    return out;
  }

  if (repeat.kind === 'weekly') {
    if (repeat.weekdays.length === 0) return [];
    const wanted = new Set(repeat.weekdays);
    let day = startOfDay(from);
    // Bounded by lookahead weeks so an empty/odd rule can't spin forever.
    for (let i = 0; i < PER_REMINDER_LOOKAHEAD * 7 + 7; i += 1) {
      if (out.length >= PER_REMINDER_LOOKAHEAD) break;
      if (wanted.has(day.getDay())) {
        const when = at(day, hour, minute);
        if (isAfter(when, from)) out.push(when);
      }
      day = addDays(day, 1);
    }
    return out;
  }

  // monthly — day is capped at 28 on input so it exists in every month
  let month = startOfDay(from);
  for (let i = 0; i < PER_REMINDER_LOOKAHEAD + 1; i += 1) {
    if (out.length >= PER_REMINDER_LOOKAHEAD) break;
    const when = at(setDate(month, repeat.day), hour, minute);
    if (isAfter(when, from)) out.push(when);
    month = addMonths(startOfDay(setDate(month, 1)), 1);
  }
  return out;
}

/**
 * Every alarm that should currently be registered with the OS, earliest first
 * and capped at [MAX_SCHEDULED].
 *
 * Alarms are skipped for any day the habit is already completed — that is the
 * whole reason firings are computed here rather than handed to the OS as a
 * repeating trigger, since a repeating trigger can't skip a single day. This
 * applies to one-off reminders too: being already done is reason enough not to
 * be nagged, whatever the repeat rule.
 */
export function plannedOccurrences(
  reminders: HabitReminder[],
  habitLogs: HabitLog[],
  from: Date = new Date(),
  limit: number = MAX_SCHEDULED_IOS
): Occurrence[] {
  const completed = new Set(
    habitLogs.filter((l) => l.completed).map((l) => `${l.habit_id}|${l.log_date}`)
  );

  const all: Occurrence[] = [];
  for (const reminder of reminders) {
    for (const date of occurrencesFor(reminder, from)) {
      if (completed.has(`${reminder.habit_id}|${format(date, 'yyyy-MM-dd')}`)) continue;
      all.push({ reminder, date });
    }
  }

  return all.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, limit);
}

/** Human-readable summary of a repeat rule, for the reminder list. */
export function describeRepeat(reminder: HabitReminder): string {
  const repeat = reminder.repeat;
  if (repeat.kind === 'daily') return 'Every day';
  if (repeat.kind === 'once') return `Once on ${repeat.date}`;
  if (repeat.kind === 'monthly') return `Monthly on day ${repeat.day}`;
  if (repeat.weekdays.length === 0) return 'No days picked';
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return [...repeat.weekdays].sort().map((d) => names[d]).join(', ');
}
