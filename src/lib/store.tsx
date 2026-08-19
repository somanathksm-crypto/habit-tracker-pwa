import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { syncScheduledReminders } from './notifications';
import {
  addForegroundActionListener,
  drainActionQueue,
  processLaunchResponse,
} from './notificationActions';
import { registerBackgroundNotificationTask } from './backgroundNotificationTask';
import { DEFAULT_SCHEDULE } from '../types';
import type { ThemeMode } from '../theme';
import type { Habit, HabitLog, HabitReminder, HabitSchedule, HabitView, WeightLog, WeightTarget } from '../types';

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
  habitView: HabitView;
  reminders: HabitReminder[];
  /** Master switch — off means nothing is scheduled regardless of per-habit times. */
  remindersEnabled: boolean;
  /** Whether we've already offered the battery-exemption prompt, so it's asked once. */
  batteryPromptShown: boolean;
  /** 'system' follows the phone; the others override it. */
  themePreference: ThemeMode;
}

const emptyState: StoredState = {
  habits: [],
  habitLogs: [],
  weightLogs: [],
  weightTarget: null,
  habitView: 'cards',
  reminders: [],
  remindersEnabled: false,
  batteryPromptShown: false,
  themePreference: 'system',
};

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

interface DataContextValue extends StoredState {
  loading: boolean;
  addHabit: (input: {
    name: string;
    schedule?: HabitSchedule;
  }) => Habit;
  updateHabit: (
    id: string,
    patch: Partial<Pick<Habit, 'name' | 'schedule'>>
  ) => void;
  deleteHabit: (id: string) => void;
  toggleHabitLog: (habitId: string, logDate: string) => void;
  logsForHabit: (habitId: string) => HabitLog[];
  upsertWeightLog: (logDate: string, value: number) => void;
  setWeightTarget: (target: Omit<WeightTarget, 'user_id'>) => void;
  setHabitView: (view: HabitView) => void;
  remindersForHabit: (habitId: string) => HabitReminder[];
  setRemindersForHabit: (habitId: string, reminders: Omit<HabitReminder, 'id' | 'habit_id'>[]) => void;
  setRemindersEnabled: (enabled: boolean) => void;
  markBatteryPromptShown: () => void;
  setThemePreference: (mode: ThemeMode) => void;
}

/**
 * Field-level fixups for snapshots written by older versions. The spread onto
 * `emptyState` above only fills in missing *top-level* keys — anything nested
 * inside a stored array has to be repaired here.
 */
function migrate(state: StoredState): StoredState {
  return {
    ...state,
    // Installs from before the layout picker was dropped stored null here.
    habitView: state.habitView ?? 'cards',
    themePreference: state.themePreference ?? 'system',
    // Habits predate schedules and were all once a day.
    habits: state.habits.map((h) => (h.schedule ? h : { ...h, schedule: { ...DEFAULT_SCHEDULE } })),
  };
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StoredState>(emptyState);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        // Merge onto emptyState rather than replacing it outright — a
        // snapshot saved before a new field/collection existed would
        // otherwise leave those keys undefined instead of [].
        if (raw) setState(migrate({ ...emptyState, ...JSON.parse(raw) }));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (loading) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state, loading]);

  // "Done" pressed on an alarm queues a tick from a background context that has
  // no access to this state. Apply anything waiting, on launch and whenever the
  // app comes back to the foreground.
  const applyPendingActions = useCallback(async () => {
    // Catch a press the background task missed before draining, so it lands in
    // the same pass rather than waiting for the next foreground event.
    await processLaunchResponse();
    const pending = await drainActionQueue();
    if (pending.length === 0) return;
    setState((s) => {
      let habitLogs = s.habitLogs;
      for (const action of pending) {
        if (action.type !== 'complete') continue;
        const existing = habitLogs.find(
          (l) => l.habit_id === action.habitId && l.log_date === action.date
        );
        // Set rather than toggle: the same press must not undo itself if it
        // somehow gets applied twice.
        if (existing) {
          if (!existing.completed) {
            habitLogs = habitLogs.map((l) =>
              l.id === existing.id ? { ...l, completed: true } : l
            );
          }
        } else {
          habitLogs = [
            ...habitLogs,
            { id: uid(), habit_id: action.habitId, log_date: action.date, completed: true },
          ];
        }
      }
      return habitLogs === s.habitLogs ? s : { ...s, habitLogs };
    });
  }, []);

  useEffect(() => {
    if (loading) return;
    registerBackgroundNotificationTask();
    applyPendingActions().catch(() => {});
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') applyPendingActions().catch(() => {});
    });
    const removeActionListener = addForegroundActionListener(() => {
      applyPendingActions().catch(() => {});
    });
    return () => {
      sub.remove();
      removeActionListener();
    };
  }, [loading, applyPendingActions]);

  // Keep the OS alarm schedule in step with stored state. Habits are a
  // dependency because renaming one changes its alarm text; habitLogs because
  // completing a habit should drop its pending alarm for that day.
  useEffect(() => {
    if (loading) return;
    // Debounced: ticking several habits in a row should settle into one sync
    // rather than firing one per tap.
    const timer = setTimeout(() => {
      syncScheduledReminders(
        state.habits,
        state.reminders,
        state.habitLogs,
        state.remindersEnabled
      ).catch(() => {});
    }, 400);
    return () => clearTimeout(timer);
  }, [state.habits, state.reminders, state.habitLogs, state.remindersEnabled, loading]);

  const value = useMemo<DataContextValue>(
    () => ({
      ...state,
      loading,
      addHabit: ({ name, schedule }) => {
        const habit: Habit = {
          id: uid(),
          user_id: LOCAL_USER_ID,
          name,
          schedule: schedule ?? { ...DEFAULT_SCHEDULE },
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
          reminders: s.reminders.filter((r) => r.habit_id !== id),
        }));
      },
      toggleHabitLog: (habitId, logDate) => {
        setState((s) => {
          const existing = s.habitLogs.find((l) => l.habit_id === habitId && l.log_date === logDate);
          if (!existing) {
            const log: HabitLog = { id: uid(), habit_id: habitId, log_date: logDate, completed: true };
            return { ...s, habitLogs: [...s.habitLogs, log] };
          }
          // A missed day is an absent row rather than a stored false — stats
          // rely on that, so a second tap removes it.
          return { ...s, habitLogs: s.habitLogs.filter((l) => l.id !== existing.id) };
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
      setHabitView: (view) => {
        setState((s) => ({ ...s, habitView: view }));
      },
      remindersForHabit: (habitId) =>
        state.reminders.filter((r) => r.habit_id === habitId).sort((a, b) => a.time.localeCompare(b.time)),
      setRemindersForHabit: (habitId, next) => {
        setState((s) => {
          // Two alarms at the same time would just fire twice.
          const seen = new Set<string>();
          const deduped = next.filter((r) => {
            const key = r.time;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          const others = s.reminders.filter((r) => r.habit_id !== habitId);
          return {
            ...s,
            reminders: [
              ...others,
              ...deduped.map((r) => ({ ...r, id: uid(), habit_id: habitId })),
            ],
          };
        });
      },
      setRemindersEnabled: (enabled) => {
        setState((s) => ({ ...s, remindersEnabled: enabled }));
      },
      setThemePreference: (mode) => {
        setState((s) => ({ ...s, themePreference: mode }));
      },
      markBatteryPromptShown: () => {
        setState((s) => ({ ...s, batteryPromptShown: true }));
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
