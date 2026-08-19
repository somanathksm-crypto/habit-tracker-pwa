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

export type PerformanceStackParamList = {
  PerformanceHub: undefined;
  MetricDetail: { metricId: string };
  AddEditMetric: { metricId?: string };
  EditMetricTarget: { metricId: string };
};

export type SettingsStackParamList = {
  Settings: undefined;
};

export type RootTabParamList = {
  TodayTab: undefined;
  GridTab: undefined;
  InsightsTab: undefined;
  PerformanceTab: undefined;
  SettingsTab: undefined;
};
