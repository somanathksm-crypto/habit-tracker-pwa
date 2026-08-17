import AsyncStorage from '@react-native-async-storage/async-storage';
import { addDays, format, subDays } from 'date-fns';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { STARTER_HABITS } from './starterHabits';
import { expectedWeightOn } from './stats';
import type { FrequencyType, Habit, HabitCategory, HabitLog, WeightLog, WeightTarget } from '../types';

// Local-first data layer, shaped exactly like the Supabase schema
// (sql/schema.sql) so it can be swapped for real Supabase calls later
// without touching any screen. Single implicit "local" user for v1.
const STORAGE_KEY = 'habit-tracker/v1';
const LOCAL_USER_ID = 'local-user';

interface StoredState {
  habits: Habit[];
  habitLogs: HabitLog[];
  weightLogs: WeightLog[];
  weightTarget: WeightTarget | null;
}

const emptyState: StoredState = {
  habits: [],
  habitLogs: [],
  weightLogs: [],
  weightTarget: null,
};

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

interface DataContextValue extends StoredState {
  loading: boolean;
  addHabit: (input: {
    name: string;
    category: HabitCategory;
    frequency_type: FrequencyType;
    target_count: number | null;
  }) => Habit;
  updateHabit: (id: string, patch: Partial<Pick<Habit, 'name' | 'category' | 'frequency_type' | 'target_count'>>) => void;
  deleteHabit: (id: string) => void;
  seedStarterHabits: () => number;
  seedDemoData: () => void;
  toggleHabitLog: (habitId: string, logDate: string) => void;
  logsForHabit: (habitId: string) => HabitLog[];
  upsertWeightLog: (logDate: string, value: number) => void;
  setWeightTarget: (target: Omit<WeightTarget, 'user_id'>) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StoredState>(emptyState);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setState(JSON.parse(raw));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (loading) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state, loading]);

  const value = useMemo<DataContextValue>(
    () => ({
      ...state,
      loading,
      addHabit: ({ name, category, frequency_type, target_count }) => {
        const habit: Habit = {
          id: uid(),
          user_id: LOCAL_USER_ID,
          name,
          category,
          frequency_type,
          target_count,
          created_at: new Date().toISOString(),
        };
        setState((s) => ({ ...s, habits: [...s.habits, habit] }));
        return habit;
      },
      updateHabit: (id, patch) => {
        setState((s) => ({
          ...s,
          habits: s.habits.map((h) => (h.id === id ? { ...h, ...patch } : h)),
        }));
      },
      deleteHabit: (id) => {
        setState((s) => ({
          ...s,
          habits: s.habits.filter((h) => h.id !== id),
          habitLogs: s.habitLogs.filter((l) => l.habit_id !== id),
        }));
      },
      seedStarterHabits: () => {
        const existingNames = new Set(state.habits.map((h) => h.name.trim().toLowerCase()));
        const toAdd = STARTER_HABITS.filter((h) => !existingNames.has(h.name.trim().toLowerCase()));
        if (toAdd.length === 0) return 0;
        const now = new Date().toISOString();
        const newHabits: Habit[] = toAdd.map((h) => ({
          id: uid(),
          user_id: LOCAL_USER_ID,
          name: h.name,
          category: h.category,
          frequency_type: h.frequency_type,
          target_count: h.target_count,
          created_at: now,
        }));
        setState((s) => ({ ...s, habits: [...s.habits, ...newHabits] }));
        return newHabits.length;
      },
      // Preview-only: fills every current habit with random history and
      // generates a plausible weight trend, so the UI can be reviewed
      // populated instead of empty. Not real data — replaces existing
      // logs/weight history each time it's run.
      seedDemoData: () => {
        setState((s) => {
          const days = 45;
          const habitIds = new Set(s.habits.map((h) => h.id));
          const keptLogs = s.habitLogs.filter((l) => !habitIds.has(l.habit_id));

          const newLogs: HabitLog[] = [];
          for (const habit of s.habits) {
            const bias = habit.frequency_type === 'weekly' ? 0.15 + Math.random() * 0.15 : 0.5 + Math.random() * 0.4;
            for (let i = days; i >= 0; i--) {
              if (Math.random() < bias) {
                newLogs.push({
                  id: uid(),
                  habit_id: habit.id,
                  log_date: format(subDays(new Date(), i), 'yyyy-MM-dd'),
                  completed: true,
                });
              }
            }
          }

          const weightTarget: WeightTarget = s.weightTarget ?? {
            user_id: LOCAL_USER_ID,
            start_value: 78 + Math.round(Math.random() * 6),
            target_value: 0, // placeholder, set below
            start_date: format(subDays(new Date(), days), 'yyyy-MM-dd'),
            target_date: format(addDays(new Date(), 60), 'yyyy-MM-dd'),
          };
          if (!s.weightTarget) {
            weightTarget.target_value = weightTarget.start_value - (6 + Math.round(Math.random() * 6));
          }

          const newWeightLogs: WeightLog[] = [];
          for (let i = days; i >= 0; i--) {
            const logDate = format(subDays(new Date(), i), 'yyyy-MM-dd');
            const expected = expectedWeightOn(weightTarget, logDate);
            const noise = (Math.random() - 0.5) * 3;
            newWeightLogs.push({
              id: uid(),
              user_id: LOCAL_USER_ID,
              log_date: logDate,
              value: Math.round((expected + noise) * 10) / 10,
            });
          }

          return {
            ...s,
            habitLogs: [...keptLogs, ...newLogs],
            weightTarget,
            weightLogs: newWeightLogs,
          };
        });
      },
      toggleHabitLog: (habitId, logDate) => {
        setState((s) => {
          const existing = s.habitLogs.find((l) => l.habit_id === habitId && l.log_date === logDate);
          if (!existing) {
            const log: HabitLog = { id: uid(), habit_id: habitId, log_date: logDate, completed: true };
            return { ...s, habitLogs: [...s.habitLogs, log] };
          }
          if (existing.completed) {
            // second tap: remove the log entirely rather than storing completed=false clutter
            return { ...s, habitLogs: s.habitLogs.filter((l) => l.id !== existing.id) };
          }
          return {
            ...s,
            habitLogs: s.habitLogs.map((l) => (l.id === existing.id ? { ...l, completed: true } : l)),
          };
        });
      },
      logsForHabit: (habitId) => state.habitLogs.filter((l) => l.habit_id === habitId),
      upsertWeightLog: (logDate, val) => {
        setState((s) => {
          const existing = s.weightLogs.find((l) => l.log_date === logDate);
          if (existing) {
            return {
              ...s,
              weightLogs: s.weightLogs.map((l) => (l.id === existing.id ? { ...l, value: val } : l)),
            };
          }
          const log: WeightLog = { id: uid(), user_id: LOCAL_USER_ID, log_date: logDate, value: val };
          return { ...s, weightLogs: [...s.weightLogs, log] };
        });
      },
      setWeightTarget: (target) => {
        setState((s) => ({ ...s, weightTarget: { ...target, user_id: LOCAL_USER_ID } }));
      },
    }),
    [state, loading]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within a DataProvider');
  return ctx;
}
