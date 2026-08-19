import type { HabitSchedule } from '../types';

// Pulled from the user's real 2026 habit-tracking spreadsheet (Habit
// Tracker sheet, "Daily Habits" table) — workout-split entries (Chest/
// Shoulder/Triceps, Lat/Biceps/Abs, Leg, Forearms) intentionally excluded,
// per the app spec's v1 scope.
export const STARTER_HABITS: { name: string; schedule: HabitSchedule }[] = [
  { name: 'Morning diet', schedule: { period: 'day' } },
  { name: 'Lunch diet', schedule: { period: 'day' } },
  { name: 'Dinner diet', schedule: { period: 'day' } },
  { name: 'Empty stomach coconut/fermented rice', schedule: { period: 'day' } },
  { name: 'Multi vitamin tabs', schedule: { period: 'day' } },
  { name: 'Omega tabs', schedule: { period: 'day' } },
  { name: 'Pre-workout', schedule: { period: 'day' } },
  { name: 'Post-workout', schedule: { period: 'day' } },
  // The spreadsheet's weekend entry — Saturday and Sunday.
  { name: 'Weekend skincare', schedule: { period: 'week', times: 2, weekdays: [0, 6] } },
  { name: 'Meditation', schedule: { period: 'day' } },
  { name: 'Evening meditation', schedule: { period: 'day' } },
  { name: 'Weight check', schedule: { period: 'day' } },
];
