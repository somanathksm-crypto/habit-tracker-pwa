import './src/lib/disableFontScaling';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DataProvider, useData } from './src/lib/store';
import { configureNotificationHandler } from './src/lib/notifications';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ThemeProvider, useIsDark, usePaperTheme } from './src/theme';

configureNotificationHandler();

/**
 * DataProvider sits outside the theme on purpose: the light/dark preference is
 * stored state, so the palette can't be resolved until the store has loaded.
 */
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <DataProvider>
          <ThemedApp />
        </DataProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function ThemedApp() {
  const { themePreference } = useData();
  return (
    <ThemeProvider mode={themePreference}>
      <PaperApp />
    </ThemeProvider>
  );
}

function PaperApp() {
  const theme = usePaperTheme();
  const isDark = useIsDark();

  return (
    <PaperProvider theme={theme}>
      <RootNavigator />
      {/* Explicit rather than "auto" — auto follows the phone, which is wrong
          the moment someone overrides the theme inside the app. */}
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </PaperProvider>
  );
}
