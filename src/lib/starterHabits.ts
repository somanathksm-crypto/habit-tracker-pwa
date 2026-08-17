import type { FrequencyType, HabitCategory } from '../types';

// Pulled from the user's real 2026 habit-tracking spreadsheet (Habit
// Tracker sheet, "Daily Habits" table) — workout-split entries (Chest/
// Shoulder/Triceps, Lat/Biceps/Abs, Leg, Forearms) intentionally excluded,
// per the app spec's v1 scope (boolean habits + weight only, no workout
// program tracking yet).
export const STARTER_HABITS: {
  name: string;
  category: HabitCategory;
  frequency_type: FrequencyType;
  target_count: number;
}[] = [
  { name: 'Morning diet', category: 'diet', frequency_type: 'daily', target_count: 30 },
  { name: 'Lunch diet', category: 'diet', frequency_type: 'daily', target_count: 30 },
  { name: 'Dinner diet', category: 'diet', frequency_type: 'daily', target_count: 30 },
  { name: 'Empty stomach coconut/fermented rice', category: 'diet', frequency_type: 'daily', target_count: 30 },
  { name: 'Multi vitamin tabs', category: 'supplement', frequency_type: 'daily', target_count: 30 },
  { name: 'Omega tabs', category: 'supplement', frequency_type: 'daily', target_count: 30 },
  { name: 'Pre-workout', category: 'supplement', frequency_type: 'daily', target_count: 30 },
  { name: 'Post-workout', category: 'supplement', frequency_type: 'daily', target_count: 30 },
  { name: 'Weekend skincare', category: 'skincare', frequency_type: 'weekly', target_count: 4 },
  { name: 'Meditation', category: 'general', frequency_type: 'daily', target_count: 30 },
  { name: 'Evening meditation', category: 'general', frequency_type: 'daily', target_count: 30 },
  { name: 'Weight check', category: 'general', frequency_type: 'daily', target_count: 30 },
];
