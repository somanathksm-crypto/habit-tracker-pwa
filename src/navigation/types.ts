export type TodayStackParamList = {
  Today: undefined;
  HabitDetail: { habitId: string };
  AddEditHabit: { habitId?: string };
};

export type InsightsStackParamList = {
  InsightsHub: undefined;
  HabitDetail: { habitId: string };
  AddEditHabit: { habitId?: string };
  WeightTrend: undefined;
  EditWeightGoal: undefined;
};

export type SettingsStackParamList = {
  Settings: undefined;
};

export type RootTabParamList = {
  TodayTab: undefined;
  InsightsTab: undefined;
  SettingsTab: undefined;
};
