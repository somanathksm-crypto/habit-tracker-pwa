export type HabitCategory = 'diet' | 'skincare' | 'supplement' | 'general';
export type FrequencyType = 'daily' | 'weekly' | 'custom';

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  category: HabitCategory;
  frequency_type: FrequencyType;
  target_count: number | null;
  created_at: string; // ISO timestamp
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
