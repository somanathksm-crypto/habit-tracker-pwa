import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { AddEditHabitScreen } from '../screens/AddEditHabitScreen';
import { AddEditMetricScreen } from '../screens/AddEditMetricScreen';
import { EditMetricTargetScreen } from '../screens/EditMetricTargetScreen';
import { EditWeightGoalScreen } from '../screens/EditWeightGoalScreen';
import { HabitDetailScreen } from '../screens/HabitDetailScreen';
import { InsightsScreen } from '../screens/InsightsScreen';
import { MetricDetailScreen } from '../screens/MetricDetailScreen';
import { PerformanceHubScreen } from '../screens/PerformanceHubScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { TodayScreen } from '../screens/TodayScreen';
import { WeightTrendScreen } from '../screens/WeightTrendScreen';
import { colors } from '../theme';
import type { InsightsStackParamList, PerformanceStackParamList, RootTabParamList, TodayStackParamList } from './types';

const TodayStack = createNativeStackNavigator<TodayStackParamList>();
const InsightsStack = createNativeStackNavigator<InsightsStackParamList>();
const PerformanceStack = createNativeStackNavigator<PerformanceStackParamList>();
const SettingsStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator<RootTabParamList>();

const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.background },
  headerShadowVisible: false,
  headerTintColor: colors.text,
  headerTitleStyle: { fontWeight: '700' as const },
};

function TodayStackNavigator() {
  return (
    <TodayStack.Navigator screenOptions={stackScreenOptions}>
      <TodayStack.Screen name="Today" component={TodayScreen} options={{ headerShown: false }} />
      <TodayStack.Screen name="HabitDetail" component={HabitDetailScreen} options={{ title: '' }} />
      <TodayStack.Screen
        name="AddEditHabit"
        component={AddEditHabitScreen}
        options={({ route }) => ({ title: route.params?.habitId ? 'Edit habit' : 'Add habit' })}
      />
    </TodayStack.Navigator>
  );
}

function InsightsStackNavigator() {
  return (
    <InsightsStack.Navigator screenOptions={stackScreenOptions}>
      <InsightsStack.Screen name="InsightsHub" component={InsightsScreen} options={{ headerShown: false }} />
      <InsightsStack.Screen name="HabitDetail" component={HabitDetailScreen} options={{ title: '' }} />
      <InsightsStack.Screen
        name="AddEditHabit"
        component={AddEditHabitScreen}
        options={({ route }) => ({ title: route.params?.habitId ? 'Edit habit' : 'Add habit' })}
      />
      <InsightsStack.Screen name="WeightTrend" component={WeightTrendScreen} options={{ title: 'Weight' }} />
      <InsightsStack.Screen name="EditWeightGoal" component={EditWeightGoalScreen} options={{ title: 'Weight goal' }} />
    </InsightsStack.Navigator>
  );
}

function PerformanceStackNavigator() {
  return (
    <PerformanceStack.Navigator screenOptions={stackScreenOptions}>
      <PerformanceStack.Screen name="PerformanceHub" component={PerformanceHubScreen} options={{ headerShown: false }} />
      <PerformanceStack.Screen name="MetricDetail" component={MetricDetailScreen} options={{ title: '' }} />
      <PerformanceStack.Screen
        name="AddEditMetric"
        component={AddEditMetricScreen}
        options={({ route }) => ({ title: route.params?.metricId ? 'Edit metric' : 'Add metric' })}
      />
      <PerformanceStack.Screen name="EditMetricTarget" component={EditMetricTargetScreen} options={{ title: 'Target' }} />
    </PerformanceStack.Navigator>
  );
}

function SettingsStackNavigator() {
  return (
    <SettingsStack.Navigator screenOptions={stackScreenOptions}>
      <SettingsStack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
    </SettingsStack.Navigator>
  );
}

const ICONS: Record<keyof RootTabParamList, keyof typeof MaterialCommunityIcons.glyphMap> = {
  TodayTab: 'check-circle-outline',
  InsightsTab: 'chart-line',
  PerformanceTab: 'speedometer',
  SettingsTab: 'cog-outline',
};

const TAB_LABELS: Record<keyof RootTabParamList, string> = {
  TodayTab: 'Today',
  InsightsTab: 'Insights',
  PerformanceTab: 'Performance',
  SettingsTab: 'Settings',
};

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
          tabBarLabel: TAB_LABELS[route.name as keyof RootTabParamList],
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name={ICONS[route.name as keyof RootTabParamList]} color={color} size={size} />
          ),
        })}
      >
        <Tab.Screen name="TodayTab" component={TodayStackNavigator} />
        <Tab.Screen name="InsightsTab" component={InsightsStackNavigator} />
        <Tab.Screen name="PerformanceTab" component={PerformanceStackNavigator} />
        <Tab.Screen name="SettingsTab" component={SettingsStackNavigator} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
