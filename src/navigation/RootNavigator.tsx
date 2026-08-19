import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AddEditHabitScreen } from '../screens/AddEditHabitScreen';
import { EditWeightGoalScreen } from '../screens/EditWeightGoalScreen';
import { HabitDetailScreen } from '../screens/HabitDetailScreen';
import { HabitGridScreen } from '../screens/HabitGridScreen';
import { InsightsScreen } from '../screens/InsightsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { TodayScreen } from '../screens/TodayScreen';
import { WeightTrendScreen } from '../screens/WeightTrendScreen';
import { useData } from '../lib/store';
import { colors } from '../theme';
import type { InsightsStackParamList, RootTabParamList, TodayStackParamList } from './types';

const TodayStack = createNativeStackNavigator<TodayStackParamList>();
const InsightsStack = createNativeStackNavigator<InsightsStackParamList>();
const SettingsStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator<RootTabParamList>();

const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.background },
  headerShadowVisible: false,
  headerTintColor: colors.text,
  headerTitleStyle: { fontWeight: '700' as const },
};

/** The main habits screen, in whichever layout the user picked. */
function HabitsHome(props: NativeStackScreenProps<TodayStackParamList, 'Today'>) {
  const { habitView } = useData();
  return habitView === 'grid' ? <HabitGridScreen {...props} /> : <TodayScreen {...props} />;
}

function TodayStackNavigator() {
  return (
    <TodayStack.Navigator screenOptions={stackScreenOptions}>
      <TodayStack.Screen name="Today" component={HabitsHome} options={{ headerShown: false }} />
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
  SettingsTab: 'cog-outline',
};

const TAB_LABELS: Record<keyof RootTabParamList, string> = {
  TodayTab: 'Today',
  InsightsTab: 'Insights',
  SettingsTab: 'Settings',
};

export function RootNavigator() {
  const { loading } = useData();

  // Hold the empty background until stored state lands, so the habits screen
  // doesn't render once with the default layout and then swap.
  if (loading) return <View style={{ flex: 1, backgroundColor: colors.background }} />;

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
        <Tab.Screen name="SettingsTab" component={SettingsStackNavigator} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
